import Canvas from './Canvas';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';

export default function GameScreen({
  roomCode, round, totalRounds, hint, wordInfo,
  timeLeft, drawTime, isDrawer, isBotDrawing,
  players, bots, drawerId, messages, myId,
  canvasProps, aiChipRef,
  emit,
}) {
  const timeFraction = timeLeft / drawTime;
  const timerColor = timeFraction > 0.5 ? '#22c55e' : timeFraction > 0.22 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* Game Header */}
      <div className="game-header">
        <div className="game-header__left">
          <span className="pill-code">{roomCode}</span>
          <span className="pill-round">{round}/{totalRounds}</span>
        </div>
        <div className="game-header__center">
          <div className="word-display">{hint}</div>
          <div className="word-info">{wordInfo}</div>
        </div>
        <div className="game-header__right">
          <div className="timer-wrap">
            <div className="timer-track">
              <div
                className="timer-fill"
                style={{ width: `${timeFraction * 100}%`, background: timerColor }}
              />
            </div>
            <div className="timer-number" style={{ color: timerColor }}>
              {timeLeft ?? '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Game Body */}
      <div className="game-body">
        <div className="canvas-area">
          <Canvas
            canvasRef={canvasProps.canvasRef}
            cursorRef={canvasProps.cursorRef}
            aiChipRef={aiChipRef}
            isDrawer={isDrawer}
            isBotDrawing={isBotDrawing}
          />
          <Toolbar
            isDrawer={isDrawer}
            drawState={canvasProps.drawState}
            setTool={canvasProps.setTool}
            setColor={canvasProps.setColor}
            setSize={canvasProps.setSize}
            doUndo={canvasProps.doUndo}
            doClear={canvasProps.doClear}
          />
        </div>
        <Sidebar
          players={players}
          bots={bots}
          drawerId={drawerId}
          myId={myId}
          messages={messages}
          isDrawer={isDrawer}
          emit={emit}
        />
      </div>
    </>
  );
}
