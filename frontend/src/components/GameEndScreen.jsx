import { useEffect } from 'react';
import { getInitials, avatarColor } from '../utils/helpers';

export default function GameEndScreen({ scores, myId, isHost, emit, onGoHome }) {
  const medals = ['🥇', '🥈', '🥉'];
  const cls = ['gold', 'silver', 'bronze'];
  const heights = [144, 110, 84];
  const order = [1, 0, 2]; // silver-gold-bronze visual order
  const top3 = scores.slice(0, 3);

  // Confetti effect
  useEffect(() => {
    const colors = ['#7c3aed', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];
    const els = [];
    for (let i = 0; i < 90; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % colors.length]};width:${5 + Math.random() * 8}px;height:${5 + Math.random() * 8}px;border-radius:${Math.random() > 0.5 ? '50%' : '3px'};animation-delay:${Math.random() * 2.5}s;animation-duration:${2 + Math.random() * 2.5}s`;
      document.body.appendChild(el);
      els.push(el);
      el.addEventListener('animationend', () => el.remove());
    }
    return () => els.forEach((el) => el.remove());
  }, []);

  return (
    <div className="end-wrapper">
      <div className="trophy">🏆</div>
      <h2 className="end-title">Game Over</h2>
      <p className="end-subtitle">Final standings</p>

      {/* Podium */}
      <div className="podium">
        {order.map((ri) => {
          const p = top3[ri];
          if (!p) return null;
          return (
            <div key={ri} className="podium-slot">
              <div className="podium-medal">{medals[ri]}</div>
              <div className="podium-name">{p.name}</div>
              <div className={`podium-bar podium-bar--${cls[ri]}`} style={{ height: heights[ri] }}>
                <div className="podium-icon">
                  {p.isBot ? (p.emoji || '🤖') : getInitials(p.name)}
                </div>
                <div className="podium-score">{p.score}</div>
                <div className="podium-label">pts</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full leaderboard */}
      <div className="end-table">
        {scores.map((p, i) => (
          <div key={p.id} className="end-row">
            <span className="end-rank">{medals[i] || ''}</span>
            <div
              className="end-avatar"
              style={{ background: p.isBot ? '#7c3aed' : avatarColor(p.name) }}
            >
              {p.isBot ? (p.emoji || '🤖') : getInitials(p.name)}
            </div>
            <span className="end-name">
              {p.name}{p.id === myId ? ' (you)' : ''}
            </span>
            <span className="end-points">{p.score} pts</span>
          </div>
        ))}
      </div>

      <div className="end-actions">
        {isHost && (
          <button className="btn btn-primary" onClick={() => emit('restart')}>
            Play Again
          </button>
        )}
        <button className="btn btn-secondary" onClick={onGoHome}>Leave</button>
      </div>
    </div>
  );
}
