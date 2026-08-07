/**
 * Tests for src/game/wordPicker.js
 */

const { pickWords } = require('../src/game/wordPicker');
const { CNN_CATS } = require('../src/game/constants');

describe('pickWords()', () => {
  test('returns exactly n words (default 3)', () => {
    const words = pickWords();
    expect(words).toHaveLength(3);
  });

  test('returns custom n words', () => {
    const words = pickWords(5);
    expect(words).toHaveLength(5);
  });

  test('always returns CNN categories', () => {
    for (let i = 0; i < 20; i++) { // run multiple times due to randomness
      const words = pickWords();
      words.forEach(w => {
        expect(CNN_CATS).toContain(w);
      });
    }
  });

  test('returns distinct words (no duplicates)', () => {
    for (let i = 0; i < 50; i++) {
      const words = pickWords(3);
      const unique = new Set(words);
      expect(unique.size).toBe(words.length);
    }
  });
});
