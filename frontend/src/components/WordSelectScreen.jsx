export default function WordSelectScreen({ isDrawer, drawerName, words, emit }) {
  if (isDrawer) {
    return (
      <div className="home-wrapper" style={{ maxWidth: '680px' }}>
        <p className="word-select-title">Choose your word</p>
        <p className="word-select-subtitle">The other players will try to guess what you draw</p>
        <div className="word-choices">
          {words.map((w) => (
            <button
              key={w}
              className="word-card"
              onClick={() => emit('select-word', w)}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="home-wrapper" style={{ maxWidth: '680px' }}>
      <div className="waiting-block">
        <div className="waiting-icon">🖌️</div>
        <p className="waiting-text">
          <strong>{drawerName}</strong> is choosing a word…
        </p>
        <div className="dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}
