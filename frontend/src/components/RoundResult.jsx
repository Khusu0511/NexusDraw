import { getInitials, avatarColor } from '../utils/helpers';

export default function RoundResult({ word, scores, countdown }) {
  return (
    <div className="overlay active">
      <div className="result-card glass-card">
        <div className="result-label">The word was</div>
        <div className="result-word">{word}</div>
        <div className="result-rows">
          {scores.map((p, i) => (
            <div key={p.id} className="result-row" style={{ animationDelay: `${i * 0.08}s` }}>
              <div
                className="result-avatar"
                style={{ background: p.isBot ? '#7c3aed' : avatarColor(p.name) }}
              >
                {p.isBot ? (p.emoji || '🤖') : getInitials(p.name)}
              </div>
              <div className="result-name">{p.name}</div>
              <div className="result-score">{p.score}</div>
              {p.roundPts > 0 && <div className="result-points">+{p.roundPts}</div>}
            </div>
          ))}
        </div>
        <div className="result-countdown">
          {countdown > 0 ? `Next round in ${countdown}…` : 'Starting…'}
        </div>
      </div>
    </div>
  );
}
