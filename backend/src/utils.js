/**
 * Shared utility functions for NexusDraw server.
 * Handles input sanitization, player display helpers, and settings validation.
 */

/**
 * Extract up to 2 uppercase initials from a player name.
 * @param {string} name - Player name
 * @returns {string} 1-2 character uppercase initials
 */
function ini(name) {
  return (name || '?').trim().slice(0, 2).toUpperCase();
}

/**
 * Sanitize and truncate a player name.
 * Strips HTML-unsafe characters and limits length to 20 chars.
 * @param {string} rawName - Raw input from the client
 * @returns {string} Cleaned name, defaults to 'Player' if empty
 */
function clean(rawName) {
  return String(rawName || 'Player')
    .trim()
    .replace(/[<>"']/g, '')
    .slice(0, 20) || 'Player';
}

/**
 * Get the display name for a player or bot in a room.
 * @param {object} room - Room object
 * @param {string} id - Player or bot ID
 * @returns {string} Display name, or '?' if not found
 */
function dname(room, id) {
  const player = room?.players.find(p => p.id === id);
  const bot = room?.bots.find(b => b.id === id);
  return player?.name || bot?.name || '?';
}

/**
 * Validate and normalize room settings from client input.
 * Clamps values to allowed ranges and whitelists enum options.
 * @param {object} raw - Raw settings object from the client
 * @returns {object} Normalized settings
 */
function parseSettings(raw) {
  return {
    rounds:     Math.min(10, Math.max(1, +raw.rounds || 3)),
    drawTime:   [60, 80, 100, 120].includes(+raw.drawTime) ? +raw.drawTime : 80,
    maxPlayers: Math.min(16, Math.max(2, +raw.maxPlayers || 8)),
    aiMode:     !!raw.aiMode,
    difficulty: ['easy', 'mixed', 'hard'].includes(raw.difficulty) ? raw.difficulty : 'mixed',
  };
}

module.exports = { ini, clean, dname, parseSettings };
