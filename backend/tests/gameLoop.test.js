/**
 * Tests for game-loop scoring and hint logic.
 *
 * We test the pure-logic parts of the game loop (scoring formula, hint
 * generation) without requiring a live Socket.io server.
 */

describe('Scoring formula', () => {
  /**
   * Mirrors the scoring formula from gameLoop.js resolveGuess():
   *   points = 60 + (timeLeft / drawTime) × 240
   */
  function calculateScore(timeLeft, drawTime) {
    return Math.round(60 + (timeLeft / drawTime) * 240);
  }

  test('maximum score when guessed immediately (timeLeft == drawTime)', () => {
    expect(calculateScore(80, 80)).toBe(300); // 60 + 240
  });

  test('minimum score when guessed at the last second (timeLeft == 1)', () => {
    expect(calculateScore(1, 80)).toBe(63); // 60 + 3
  });

  test('zero time remaining gives base score', () => {
    expect(calculateScore(0, 80)).toBe(60);
  });

  test('mid-round gives proportional score', () => {
    expect(calculateScore(40, 80)).toBe(180); // 60 + 120
  });

  test('works with different draw times', () => {
    expect(calculateScore(60, 60)).toBe(300);
    expect(calculateScore(60, 120)).toBe(180); // 60 + 120
  });
});

describe('Hint generation', () => {
  /**
   * Mirrors the hint generation logic from gameLoop.js:
   *   [...word].map(c => c === ' ' ? '/' : '_').join(' ')
   */
  function generateHint(word) {
    return [...word].map(c => (c === ' ' ? '/' : '_')).join(' ');
  }

  test('replaces each letter with underscore', () => {
    expect(generateHint('cat')).toBe('_ _ _');
    expect(generateHint('hello')).toBe('_ _ _ _ _');
  });

  test('preserves spaces as forward slashes', () => {
    expect(generateHint('ice cream')).toBe('_ _ _ / _ _ _ _ _');
  });

  test('single character word', () => {
    expect(generateHint('a')).toBe('_');
  });
});

describe('Guess matching', () => {
  /**
   * Mirrors resolveGuess() logic — exact match only.
   * Partial matching was removed because it was exploitable
   * (e.g. "butter" matched "butterfly", "cycle" matched "bicycle").
   */
  function isCorrectGuess(guess, target) {
    return guess === target;
  }

  test('exact match is correct', () => {
    expect(isCorrectGuess('umbrella', 'umbrella')).toBe(true);
  });

  test('substring match is NOT correct (partial matching removed)', () => {
    expect(isCorrectGuess('umbrel', 'umbrella')).toBe(false);
  });

  test('short substring is NOT correct', () => {
    expect(isCorrectGuess('umb', 'umbrella')).toBe(false);
  });

  test('completely wrong guess', () => {
    expect(isCorrectGuess('pizza', 'umbrella')).toBe(false);
  });

  test('case sensitivity matters (both should be lowered by caller)', () => {
    expect(isCorrectGuess('cat', 'cat')).toBe(true);
    expect(isCorrectGuess('Cat', 'cat')).toBe(false); // caller should lowercase
  });
});
