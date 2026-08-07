/**
 * Room lifecycle management.
 * Encapsulates the in-memory room store and exposes CRUD helpers.
 */

/** @type {Map<string, object>} Active rooms keyed by room code */
const rooms = new Map();

/** Characters used in room codes (ambiguous chars like O/0, I/1 excluded). */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random 6-character room code.
 * @returns {string} e.g. 'X7KM3P'
 */
function genCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  // Avoid collisions with existing rooms (extremely unlikely but defensive)
  if (rooms.has(code)) return genCode();
  return code;
}

/**
 * Look up a room by its code.
 * @param {string} code
 * @returns {object|undefined}
 */
function getRoom(code) {
  return rooms.get(code);
}

/**
 * Store a new room.
 * @param {string} code
 * @param {object} room
 */
function setRoom(code, room) {
  rooms.set(code, room);
}

/**
 * Delete a room (e.g. when all players leave).
 * @param {string} code
 */
function deleteRoom(code) {
  rooms.delete(code);
}

/**
 * Check whether a room exists.
 * @param {string} code
 * @returns {boolean}
 */
function hasRoom(code) {
  return rooms.has(code);
}

/**
 * Find a player inside a room by socket ID.
 * @param {object} room
 * @param {string} id - Socket ID
 * @returns {object|undefined}
 */
function getPlayer(room, id) {
  return room?.players.find(p => p.id === id);
}

/**
 * Find a bot inside a room by bot ID.
 * @param {object} room
 * @param {string} id - Bot ID
 * @returns {object|undefined}
 */
function getBot(room, id) {
  return room?.bots.find(b => b.id === id);
}

/**
 * Check whether the given ID belongs to a bot.
 * @param {object} room
 * @param {string} id
 * @returns {boolean}
 */
function isBot(room, id) {
  return !!getBot(room, id);
}

/**
 * Create a fresh game-state object for a new or restarted game.
 * @returns {object}
 */
function freshGame() {
  return {
    phase: 'waiting',
    round: 0,
    drawerIdx: 0,
    drawerId: null,
    word: null,
    hint: null,
    wordChoices: [],
    timeLeft: 0,
    timerInt: null,
    autoSel: null,
    revealAt: new Set(),
  };
}

/**
 * Create a minimal snapshot of a room for the initial join response.
 * Strips internal fields (timers, words) that clients shouldn't see.
 * @param {object} room
 * @returns {object}
 */
function snapshot(room) {
  return {
    code: room.code,
    settings: room.settings,
    host: room.host,
    players: room.players,
    bots: room.bots.map(b => ({
      id: b.id, name: b.name, avatar: b.avatar, emoji: b.emoji, score: b.score || 0,
    })),
    game: { phase: room.game.phase },
  };
}

module.exports = {
  genCode, getRoom, setRoom, deleteRoom, hasRoom,
  getPlayer, getBot, isBot, freshGame, snapshot,
};
