/**
 * Word selection for each drawing round.
 * Restricts all selections to the 25 CNN categories so all games use the
 * model's dictionary.
 */

const { CNN_CATS } = require('./constants');

/**
 * Pick `n` random, non-repeating words for a round.
 * @param {number} [n=3] - How many word choices to offer
 * @returns {string[]} Array of `n` words
 */
function pickWords(n = 3) {
  return [...CNN_CATS].sort(() => Math.random() - 0.5).slice(0, n);
}

module.exports = { pickWords };
