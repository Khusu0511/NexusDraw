/**
 * Shared constants for game logic.
 * CNN_CATS lists the 25 categories the trained model can recognise.
 */

/** The 25 object categories the CNN was trained to classify. */
const CNN_CATS = [
  'airplane', 'apple', 'bicycle', 'bird', 'book',
  'butterfly', 'car', 'cat', 'circle', 'clock',
  'cloud', 'dog', 'fish', 'flower', 'guitar',
  'house', 'moon', 'pizza', 'shoe', 'square',
  'star', 'sun', 'tree', 'triangle', 'umbrella',
];

module.exports = { CNN_CATS };
