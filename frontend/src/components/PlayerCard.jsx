import { getInitials, avatarColor } from '../utils/helpers';

export default function PlayerCard({ player, isMe, isHost, isBot }) {
  return (
    <div className={`player-card${isMe ? ' player-card--me' : ''}`}>
      <div
        className="player-avatar"
        style={{ background: isBot ? '#7c3aed' : avatarColor(player.name) }}
      >
        {isBot ? (player.emoji || '🤖') : getInitials(player.name)}
      </div>
      <div className="player-name" title={player.name}>
        {player.name}
        {isMe && ' (you)'}
      </div>
      {isHost && <div className="host-badge">Host</div>}
      {isBot && !isHost && <div className="host-badge">AI</div>}
    </div>
  );
}
