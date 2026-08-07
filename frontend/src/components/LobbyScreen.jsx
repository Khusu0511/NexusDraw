import { useState } from 'react';
import PlayerCard from './PlayerCard';
import { getInitials, avatarColor } from '../utils/helpers';

export default function LobbyScreen({ room, myId, isHost, emit, addToast }) {
  const [showSettings, setShowSettings] = useState(false);

  if (!room) return null;

  const copyInvite = () => {
    navigator.clipboard
      .writeText(`${location.origin}/?join=${room.code}`)
      .then(() => addToast('Invite link copied!', 'success'))
      .catch(() => addToast(`${location.origin}/?join=${room.code}`, 'info'));
  };

  const pushSettings = (field, value) => {
    const updated = { ...room.settings, [field]: value };
    emit('update-settings', updated);
  };

  const max = room.settings?.maxPlayers || 8;
  const allCount = room.players.length + (room.bots || []).length;
  const canStart = isHost && allCount >= 2;

  return (
    <div className="lobby-wrapper">
      {/* Header */}
      <div className="lobby-header">
        <div>
          <div className="code-label">Room Code</div>
          <div className="code-display">{room.code}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={copyInvite}>Copy Invite</button>
          {isHost && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowSettings(!showSettings)}
            >
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && isHost && (
        <div className="glass-card">
          <div className="settings-grid">
            <div className="settings-row">
              <label>Rounds</label>
              <select
                className="form-input"
                value={room.settings?.rounds || 3}
                onChange={(e) => pushSettings('rounds', +e.target.value)}
              >
                <option>2</option><option>3</option><option>5</option><option>7</option>
              </select>
            </div>
            <div className="settings-row">
              <label>Draw time</label>
              <select
                className="form-input"
                value={room.settings?.drawTime || 80}
                onChange={(e) => pushSettings('drawTime', +e.target.value)}
              >
                <option value={60}>60s</option>
                <option value={80}>80s</option>
                <option value={100}>100s</option>
                <option value={120}>2 min</option>
              </select>
            </div>
            <div className="settings-row">
              <label>Difficulty</label>
              <select
                className="form-input"
                value={room.settings?.difficulty || 'mixed'}
                onChange={(e) => pushSettings('difficulty', e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="mixed">Mixed</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Player Grid */}
      <div className="player-grid">
        {room.players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            isMe={p.id === myId}
            isHost={p.id === room.host}
            isBot={false}
          />
        ))}
        {(room.bots || []).map((b) => (
          <PlayerCard
            key={b.id}
            player={b}
            isMe={false}
            isHost={false}
            isBot={true}
          />
        ))}
        {Array.from({ length: max - allCount }, (_, i) => (
          <div key={`empty-${i}`} className="lobby-empty">Waiting…</div>
        ))}
      </div>

      {/* Footer */}
      <div className="lobby-footer">
        <p className="lobby-status">
          {allCount < 2
            ? `Need ${2 - allCount} more player…`
            : `${allCount} player${allCount !== 1 ? 's' : ''} ready`}
        </p>
        <button
          className="btn btn-primary"
          disabled={!canStart}
          onClick={() => emit('start-game')}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
