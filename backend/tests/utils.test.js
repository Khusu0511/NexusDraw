/**
 * Tests for src/utils.js
 */

const { ini, clean, parseSettings } = require('../src/utils');

describe('ini() — extract initials', () => {
  test('returns first two chars uppercased', () => {
    expect(ini('alice')).toBe('AL');
  });

  test('handles single character', () => {
    expect(ini('B')).toBe('B');
  });

  test('returns "?" for falsy input', () => {
    expect(ini(null)).toBe('?');
    expect(ini('')).toBe('?');
    expect(ini(undefined)).toBe('?');
  });

  test('trims whitespace before extracting', () => {
    expect(ini('  hello')).toBe('HE');
  });
});

describe('clean() — sanitise player name', () => {
  test('strips dangerous characters', () => {
    expect(clean('<script>alert(1)</script>')).toBe('scriptalert(1)/scrip');
  });

  test('truncates to 20 characters', () => {
    expect(clean('a'.repeat(30))).toBe('a'.repeat(20));
  });

  test('defaults to "Player" for empty input', () => {
    expect(clean('')).toBe('Player');
    expect(clean(null)).toBe('Player');
    expect(clean(undefined)).toBe('Player');
  });

  test('trims surrounding whitespace', () => {
    expect(clean('  Bob  ')).toBe('Bob');
  });
});

describe('parseSettings() — validate room settings', () => {
  test('clamps rounds to [1, 10]', () => {
    // rounds=0 is falsy → falls back to default 3 via `||`
    expect(parseSettings({ rounds: 0 }).rounds).toBe(3);
    expect(parseSettings({ rounds: -5 }).rounds).toBe(1);
    expect(parseSettings({ rounds: 50 }).rounds).toBe(10);
    expect(parseSettings({ rounds: 5 }).rounds).toBe(5);
  });

  test('only allows whitelisted draw times', () => {
    expect(parseSettings({ drawTime: 60 }).drawTime).toBe(60);
    expect(parseSettings({ drawTime: 80 }).drawTime).toBe(80);
    expect(parseSettings({ drawTime: 90 }).drawTime).toBe(80); // invalid → default
    expect(parseSettings({ drawTime: 120 }).drawTime).toBe(120);
  });



  test('clamps maxPlayers to [2, 16]', () => {
    expect(parseSettings({ maxPlayers: 1 }).maxPlayers).toBe(2);
    expect(parseSettings({ maxPlayers: 100 }).maxPlayers).toBe(16);
    expect(parseSettings({ maxPlayers: 8 }).maxPlayers).toBe(8);
  });

  test('coerces aiMode to boolean', () => {
    expect(parseSettings({ aiMode: 1 }).aiMode).toBe(true);
    expect(parseSettings({ aiMode: 0 }).aiMode).toBe(false);
    expect(parseSettings({ aiMode: undefined }).aiMode).toBe(false);
  });

  test('provides defaults for missing fields', () => {
    const s = parseSettings({});
    expect(s.rounds).toBe(3);
    expect(s.drawTime).toBe(80);
    expect(s.maxPlayers).toBe(8);
    expect(s.aiMode).toBe(false);
    expect(s.difficulty).toBe('mixed');
  });

  test('validates difficulty against whitelist', () => {
    expect(parseSettings({ difficulty: 'easy' }).difficulty).toBe('easy');
    expect(parseSettings({ difficulty: 'hard' }).difficulty).toBe('hard');
    expect(parseSettings({ difficulty: 'mixed' }).difficulty).toBe('mixed');
    expect(parseSettings({ difficulty: 'impossible' }).difficulty).toBe('mixed'); // invalid → default
    expect(parseSettings({ difficulty: '' }).difficulty).toBe('mixed');
    expect(parseSettings({ difficulty: undefined }).difficulty).toBe('mixed');
  });
});
