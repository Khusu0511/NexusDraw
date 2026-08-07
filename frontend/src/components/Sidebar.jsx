import { useState, useRef, useEffect } from 'react';
import { getInitials, avatarColor, escapeHtml } from '../utils/helpers';

export default function Sidebar({ players, bots, drawerId, myId, messages, isDrawer, emit }) {
  const [input, setInput] = useState('');
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMsg = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    isDrawer ? emit('chat', text) : emit('guess', text);
  };

  const all = [
    ...players.map((p) => ({ ...p, isBot: false })),
    ...(bots || []).map((b) => ({ ...b, isBot: true })),
  ];

  return (
    <div className="sidebar">
      {/* Players Panel */}
      <div className="players-panel">
        <div className="sidebar-heading">Players</div>
        {all.map((p) => (
          <div key={p.id} className={`player-row${p.id === myId ? ' player-row--me' : ''}`}>
            <div
              style={{
                width: 27, height: 27, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: p.isBot ? 14 : 11, fontWeight: 800, color: '#fff', flexShrink: 0,
                background: p.isBot ? '#7c3aed' : avatarColor(p.name),
              }}
            >
              {p.isBot ? (p.emoji || '🤖') : getInitials(p.name)}
            </div>
            <div className="player-row__info">
              <div className="player-row__name">
                {p.name}{p.id === myId ? ' (you)' : ''}
              </div>
              <div className="player-row__score">{p.score || 0} pts</div>
            </div>
            <div>
              {p.id === drawerId
                ? <span className="badge-drawing">drawing</span>
                : p.hasGuessed
                  ? <span className="badge-correct">✓</span>
                  : null}
            </div>
          </div>
        ))}
      </div>

      {/* Chat Panel */}
      <div className="chat-panel">
        <div ref={feedRef} id="cfeed">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg chat-msg--${msg.type}`}>
              {msg.type === 'sys' && <span className="chat-msg--system">{msg.text}</span>}
              {msg.type === 'ok' && <span className="chat-msg--correct">{msg.text}</span>}
              {msg.type === 'bot' && <span className="chat-msg--bot">{msg.text}</span>}
              {msg.type === 'wrong' && (
                <>
                  <span style={{ color: '#818cf8', fontWeight: 700 }}>{msg.name}:</span>{' '}
                  <span style={{ color: '#64748b' }}>{msg.text}</span>
                </>
              )}
              {msg.type === 'chat' && (
                <>
                  <span style={{ color: '#94a3b8', fontWeight: 700 }}>{msg.name}:</span>{' '}
                  <span>{msg.text}</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="chat-bar">
          <input
            className="chat-input"
            placeholder={isDrawer ? 'Chat…' : 'Type your guess…'}
            maxLength={100}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          />
          <button className="chat-send" onClick={sendMsg}>↵</button>
        </div>
      </div>
    </div>
  );
}
