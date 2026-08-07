/**
 * App.jsx — Main application component.
 *
 * Manages global game state and screen transitions. Wires together:
 *  - useSocket for network communication
 *  - useCanvas for drawing logic
 *  - useAI for TensorFlow.js inference
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import useSocket from './hooks/useSocket';
import useCanvas from './hooks/useCanvas';
import useAI from './hooks/useAI';

import HomeScreen from './components/HomeScreen';
import LobbyScreen from './components/LobbyScreen';
import WordSelectScreen from './components/WordSelectScreen';
import GameScreen from './components/GameScreen';
import GameEndScreen from './components/GameEndScreen';
import RoundResult from './components/RoundResult';
import Toast from './components/Toast';

import './styles/index.css';

let toastId = 0;

export default function App() {
  // ── Global state ────────────────────────────────────────────────────
  const [screen, setScreen] = useState('home');
  const [myId, setMyId] = useState(null);
  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [isDrawer, setIsDrawer] = useState(false);
  const [phase, setPhase] = useState('home');
  const [drawTime, setDrawTime] = useState(80);

  // Word select
  const [wordChoices, setWordChoices] = useState([]);
  const [drawerName, setDrawerName] = useState('');

  // Game state
  const [hint, setHint] = useState('_ _ _ _');
  const [wordInfo, setWordInfo] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [round, setRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [drawerId, setDrawerId] = useState(null);
  const [isBotDrawing, setIsBotDrawing] = useState(false);

  // Chat
  const [messages, setMessages] = useState([]);
  const addMsg = useCallback((type, text, name = '') => {
    setMessages((prev) => [...prev.slice(-199), { type, text, name }]);
  }, []);

  // Round result overlay
  const [roundResult, setRoundResult] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Game end
  const [endScores, setEndScores] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  // Bot
  const botRef = useRef(null);

  // Canvas and AI refs (set after hooks init)
  const canvasRef = useRef(null);
  const aiRef = useRef(null);

  // ── Socket event handler ────────────────────────────────────────────
  const onEvent = useCallback((event, data) => {
    const cv = canvasRef.current;
    const aiCtrl = aiRef.current;

    switch (event) {
      case 'connect':
        setMyId(data.id);
        break;
      case 'room-created':
        setRoom(data.room);
        setIsHost(true);
        setScreen('lobby');
        history.replaceState(null, '', `/?join=${data.code}`);
        addToast('Room created!', 'info');
        break;
      case 'room-joined':
        setRoom(data.room);
        setScreen('lobby');
        addToast('Joined!', 'success');
        break;
      case 'join-error':
        addToast(data, 'error');
        break;
      case 'room-update':
        setRoom(data);
        setDrawTime(data.settings?.drawTime || 80);
        if (data.bots?.[0]) botRef.current = data.bots[0];
        if (data.game?.phase === 'waiting') {
          setScreen('lobby');
        }
        break;
      case 'player-joined':
        addToast(`${data.name} joined`, 'info');
        break;
      case 'player-left':
        addToast('A player left', 'info');
        break;
      case 'host-promoted':
        setIsHost(true);
        addToast('You are now the host', 'info');
        break;
      case 'kicked':
        addToast('You were removed', 'error');
        setScreen('home');
        setRoom(null);
        setIsHost(false);
        break;
      case 'game-started':
        setMessages([]);
        break;
      case 'round-started': {
        const { round: r, totalRounds: tr, drawerId: did, drawerName: dn, drawerIsBot: db } = data;
        setRound(r);
        setTotalRounds(tr);
        setDrawerId(did);
        setDrawerName(db ? '🤖 ' + dn : dn);
        setIsDrawer(did === myId);
        setIsBotDrawing(db);
        if (botRef.current) botRef.current.hasGuessed = false;
        setScreen('word');
        break;
      }
      case 'word-choices':
        setWordChoices(data);
        break;
      case 'word-for-drawer':
        setIsDrawer(true);
        setPhase('drawing');
        setHint(data.word);
        setWordInfo('You are drawing');
        setScreen('game');
        cv?.initCanvas();
        aiCtrl?.resetBotState();
        aiCtrl?.startLoop();
        break;
      case 'hint-init':
        setIsDrawer(false);
        setPhase('drawing');
        setHint(data.hint);
        setWordInfo(`${data.wordLen} letters`);
        setIsBotDrawing(data.isBotDrawing);
        setScreen('game');
        cv?.initCanvas();
        aiCtrl?.resetBotState();
        aiCtrl?.startLoop();
        break;
      case 'hint-update':
        setHint(data);
        break;
      case 'phase-change':
        setPhase(data.phase);
        break;
      case 'timer':
        setTimeLeft(data);
        break;
      case 'stroke':
        cv?.handleRemoteStroke(data);
        break;
      case 'fill':
        cv?.handleRemoteFill(data);
        break;
      case 'undo':
        cv?.handleRemoteUndo();
        break;
      case 'canvas-clear':
        cv?.clearCanvas();
        break;
      case 'bot-stroke':
        cv?.handleBotStroke(data);
        break;
      case 'correct-guess':
        if (botRef.current && data.pid === botRef.current.id) botRef.current.hasGuessed = true;
        if (data.pid === myId) addToast(`+${data.points} pts`, 'success');
        addMsg('ok', `✓ ${data.name} guessed it!  +${data.points}`);
        break;
      case 'wrong-guess':
        data.isBot ? addMsg('bot', `🤖 ${data.guess}`) : addMsg('wrong', data.guess, data.name);
        break;
      case 'chat':
        addMsg('chat', data.text, data.name);
        break;
      case 'round-ended':
        aiCtrl?.stopLoop();
        setRoundResult(data);
        setCountdown(6);
        break;
      case 'game-ended':
        aiCtrl?.stopLoop();
        setRoundResult(null);
        setEndScores(data.scores);
        setScreen('end');
        break;
    }
  }, [myId, addToast, addMsg]);

  // ── Hooks init ──────────────────────────────────────────────────────
  const { emit } = useSocket({ onEvent });
  const canvas = useCanvas({ isDrawer, emit });
  const ai = useAI({
    canvasRef: canvas.canvasRef,
    isDrawer,
    phase,
    botRef,
    emit,
  });

  // Wire refs so onEvent callback can access canvas/ai
  useEffect(() => { canvasRef.current = canvas; }, [canvas]);
  useEffect(() => { aiRef.current = ai; }, [ai]);

  // Round result countdown
  useEffect(() => {
    if (!roundResult) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); setRoundResult(null); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [roundResult]);

  const goHome = () => {
    emit('leave-room');
    setScreen('home');
    setRoom(null);
    setIsHost(false);
    setIsDrawer(false);
    setPhase('home');
    setEndScores(null);
    setMessages([]);
    ai.stopLoop();
    history.replaceState(null, '/', '/');
  };

  return (
    <>
      <div className="bg-canvas">
        <div className="hex-pattern" />
        <div className="orb orb--purple" />
        <div className="orb orb--cyan" />
      </div>

      <Toast toasts={toasts} />

      <div className={`screen${screen === 'home' ? ' active' : ''}`}>
        <HomeScreen emit={emit} addToast={addToast} />
      </div>

      <div className={`screen${screen === 'lobby' ? ' active' : ''}`}>
        <LobbyScreen room={room} myId={myId} isHost={isHost} emit={emit} addToast={addToast} />
      </div>

      <div className={`screen${screen === 'word' ? ' active' : ''}`}>
        <WordSelectScreen isDrawer={isDrawer} drawerName={drawerName} words={wordChoices} emit={emit} />
      </div>

      <div className={`screen screen--game${screen === 'game' ? ' active' : ''}`}>
        <GameScreen
          roomCode={room?.code || '------'}
          round={round}
          totalRounds={totalRounds}
          hint={hint}
          wordInfo={wordInfo}
          timeLeft={timeLeft}
          drawTime={drawTime}
          isDrawer={isDrawer}
          isBotDrawing={isBotDrawing}
          players={room?.players || []}
          bots={room?.bots || []}
          drawerId={drawerId}
          messages={messages}
          myId={myId}
          canvasProps={canvas}
          aiChipRef={ai.aiChipRef}
          emit={emit}
        />
      </div>

      <div className={`screen${screen === 'end' ? ' active' : ''}`}>
        {endScores && (
          <GameEndScreen scores={endScores} myId={myId} isHost={isHost} emit={emit} onGoHome={goHome} />
        )}
      </div>

      {roundResult && (
        <RoundResult word={roundResult.word} scores={roundResult.scores} countdown={countdown} />
      )}
    </>
  );
}
