import { useState, useEffect } from 'react';

export default function HomeScreen({ emit, addToast }) {
  const [name, setName] = useState('');
  const [tab, setTab] = useState('create');
  const [code, setCode] = useState('');
  const [settings, setSettings] = useState({
    rounds: 3,
    drawTime: 80,
    aiMode: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setTab('join');
      setCode(joinCode.toUpperCase());
    }
  }, []);

  const handleCreate = () => {
    const playerName = name.trim() || 'Player';
    emit('create-room', {
      name: playerName,
      settings,
      addBot: settings.aiMode,
    });
  };

  const handleJoin = () => {
    const playerName = name.trim() || 'Player';
    const roomCode = code.trim().toUpperCase();
    if (!roomCode) {
      addToast('Enter a room code', 'error');
      return;
    }
    emit('join-room', { name: playerName, code: roomCode });
  };

  return (
    <div className="home-wrapper">
      {/* Hero */}
      <div className="hero">
        <div className="hero-row">
          <svg className="logo-svg" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="55%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <polygon points="32,3 59,18 59,46 32,61 5,46 5,18" stroke="url(#lg)" strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="32" cy="3" r="3.5" fill="url(#lg)" /><circle cx="59" cy="18" r="3.5" fill="url(#lg)" />
            <circle cx="59" cy="46" r="3.5" fill="url(#lg)" /><circle cx="32" cy="61" r="3.5" fill="url(#lg)" />
            <circle cx="5" cy="46" r="3.5" fill="url(#lg)" /><circle cx="5" cy="18" r="3.5" fill="url(#lg)" />
            <circle cx="32" cy="32" r="4.5" fill="url(#lg)" />
            <line x1="32" y1="6.5" x2="32" y2="27.5" stroke="url(#lg)" strokeWidth="1.2" opacity=".5" />
            <line x1="56" y1="20" x2="35" y2="30" stroke="url(#lg)" strokeWidth="1.2" opacity=".5" />
            <line x1="56" y1="44" x2="35" y2="34" stroke="url(#lg)" strokeWidth="1.2" opacity=".5" />
            <line x1="32" y1="57.5" x2="32" y2="36.5" stroke="url(#lg)" strokeWidth="1.2" opacity=".5" />
            <line x1="8" y1="44" x2="29" y2="34" stroke="url(#lg)" strokeWidth="1.2" opacity=".5" />
            <line x1="8" y1="20" x2="29" y2="30" stroke="url(#lg)" strokeWidth="1.2" opacity=".5" />
          </svg>
          <div>
            <div className="logo-title">NEXUS</div>
            <div className="logo-subtitle">DRAW</div>
          </div>
        </div>
        <div className="hero-tagline">Draw · Guess · Win</div>
      </div>

      {/* Card */}
      <div className="home-card glass-card">
        <input
          className="form-input"
          placeholder="Your name"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="tab-bar">
          <button
            className={`tab${tab === 'create' ? ' active' : ''}`}
            onClick={() => setTab('create')}
          >
            Create Room
          </button>
          <button
            className={`tab${tab === 'join' ? ' active' : ''}`}
            onClick={() => setTab('join')}
          >
            Join Room
          </button>
        </div>

        {tab === 'create' ? (
          <div>
            <div className="settings-row">
              <label>Rounds</label>
              <select
                className="form-input"
                value={settings.rounds}
                onChange={(e) => setSettings((s) => ({ ...s, rounds: +e.target.value }))}
              >
                <option>2</option><option>3</option><option>5</option><option>7</option>
              </select>
            </div>
            <div className="settings-row">
              <label>Draw time</label>
              <select
                className="form-input"
                value={settings.drawTime}
                onChange={(e) => setSettings((s) => ({ ...s, drawTime: +e.target.value }))}
              >
                <option value={60}>60s</option>
                <option value={80}>80s</option>
                <option value={100}>100s</option>
                <option value={120}>2 min</option>
              </select>
            </div>

            <label className="ai-toggle">
              <input
                type="checkbox"
                checked={settings.aiMode}
                onChange={(e) => setSettings((s) => ({ ...s, aiMode: e.target.checked }))}
              />
              <div>
                <div className="ai-toggle__label">AI Player</div>
                <div className="ai-toggle__desc">Joins as a guesser using computer vision</div>
              </div>
            </label>
            <button className="btn btn-primary btn--full" onClick={handleCreate}>
              Create Room →
            </button>
          </div>
        ) : (
          <div>
            <input
              className="form-input form-input--code"
              placeholder="ROOM CODE"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button className="btn btn-primary btn--full" onClick={handleJoin}>
              Join Room →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
