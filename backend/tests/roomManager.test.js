/**
 * Tests for src/game/roomManager.js
 */

const {
  genCode, getRoom, setRoom, deleteRoom, hasRoom,
  getPlayer, getBot, isBot, freshGame, snapshot,
} = require('../src/game/roomManager');

describe('genCode()', () => {
  test('returns a 6-character string', () => {
    const code = genCode();
    expect(code).toHaveLength(6);
  });

  test('only contains valid characters (no ambiguous O/0/I/1)', () => {
    const valid = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 100; i++) {
      const code = genCode();
      for (const ch of code) {
        expect(valid).toContain(ch);
      }
    }
  });

  test('generates unique codes (probabilistic)', () => {
    const codes = new Set();
    for (let i = 0; i < 200; i++) codes.add(genCode());
    expect(codes.size).toBeGreaterThan(190); // extremely unlikely to have collisions
  });
});

describe('Room CRUD', () => {
  beforeEach(() => {
    // Clean up any existing rooms
    if (hasRoom('TEST01')) deleteRoom('TEST01');
  });

  test('setRoom / getRoom / hasRoom / deleteRoom', () => {
    const room = { code: 'TEST01', players: [] };
    setRoom('TEST01', room);
    expect(hasRoom('TEST01')).toBe(true);
    expect(getRoom('TEST01')).toBe(room);

    deleteRoom('TEST01');
    expect(hasRoom('TEST01')).toBe(false);
    expect(getRoom('TEST01')).toBeUndefined();
  });
});

describe('getPlayer / getBot / isBot', () => {
  const room = {
    players: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ],
    bots: [
      { id: 'bot_ai_1', name: 'AI' },
    ],
  };

  test('getPlayer finds existing player', () => {
    expect(getPlayer(room, 'p1').name).toBe('Alice');
  });

  test('getPlayer returns undefined for unknown id', () => {
    expect(getPlayer(room, 'nope')).toBeUndefined();
  });

  test('getBot finds existing bot', () => {
    expect(getBot(room, 'bot_ai_1').name).toBe('AI');
  });

  test('isBot correctly identifies bots vs players', () => {
    expect(isBot(room, 'bot_ai_1')).toBe(true);
    expect(isBot(room, 'p1')).toBe(false);
  });
});

describe('freshGame()', () => {
  test('returns a clean game state', () => {
    const g = freshGame();
    expect(g.phase).toBe('waiting');
    expect(g.round).toBe(0);
    expect(g.drawerIdx).toBe(0);
    expect(g.drawerId).toBeNull();
    expect(g.word).toBeNull();
    expect(g.timerInt).toBeNull();
  });
});

describe('snapshot()', () => {
  test('strips internal fields from room', () => {
    const room = {
      code: 'ABC123',
      settings: { rounds: 3, drawTime: 80, difficulty: 'mixed', maxPlayers: 8, aiMode: false },
      host: 'p1',
      players: [{ id: 'p1', name: 'Alice', score: 100 }],
      bots: [{ id: 'bot_1', name: 'AI', avatar: 'AI', emoji: '🤖', score: 50, confidence: 0.38, paceMs: 7000 }],
      game: { phase: 'waiting', timerInt: null, word: 'secret' },
    };

    const snap = snapshot(room);
    expect(snap.code).toBe('ABC123');
    expect(snap.game.phase).toBe('waiting');
    expect(snap.game.word).toBeUndefined();     // word should NOT leak
    expect(snap.bots[0].confidence).toBeUndefined(); // internal fields stripped
  });
});
