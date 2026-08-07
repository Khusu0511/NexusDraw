/**
 * Core game-loop logic: rounds, timers, scoring, and hint reveals.
 *
 * All functions receive an `io` (Socket.io server) reference and operate on
 * room objects. This keeps game rules separated from network transport.
 */

const { pickWords }  = require('./wordPicker');
const { genStrokes }  = require('./botDrawing');
const { getPlayer, getBot, isBot, deleteRoom } = require('./roomManager');
const { ini, dname }  = require('../utils');

/**
 * Broadcast an event to every socket in a room.
 * @param {import('socket.io').Server} io
 * @param {object} room
 * @param {string} event
 * @param {object} data
 */
function bcast(io, room, event, data) {
  io.to(room.code).emit(event, data);
}

/**
 * Push a full room-state update to all connected clients.
 * @param {import('socket.io').Server} io
 * @param {object} room
 */
function sync(io, room) {
  bcast(io, room, 'room-update', {
    code: room.code,
    settings: room.settings,
    host: room.host,
    players: room.players,
    bots: room.bots.map(b => ({
      id: b.id, name: b.name, avatar: b.avatar, emoji: b.emoji,
      score: b.score || 0, hasGuessed: !!b.hasGuessed,
    })),
    game: {
      phase: room.game.phase,
      round: room.game.round,
      totalRounds: room.settings.rounds,
      drawerId: room.game.drawerId,
      timeLeft: room.game.timeLeft,
      wordLen: room.game.word?.length || 0,
      aiMode: room.settings.aiMode,
      drawerIsBot: isBot(room, room.game.drawerId),
    },
  });
}

/**
 * Begin a new round. If all rounds are done, end the game instead.
 * @param {import('socket.io').Server} io
 * @param {object} room
 */
function startRound(io, room) {
  const g = room.game;
  if (g.round >= room.settings.rounds) {
    endGame(io, room);
    return;
  }

  g.round++;
  g.phase = 'word-select';
  g.word = null;
  g.hint = null;

  const all = [...room.players.map(p => p.id), ...room.bots.map(b => b.id)];
  g.drawerId = all[(g.drawerIdx++) % all.length];
  room.players.forEach(p => { p.hasGuessed = false; p.roundPts = 0; });
  room.bots.forEach(b =>    { b.hasGuessed = false; b.roundPts = 0; });

  const words = pickWords();
  g.wordChoices = words;

  bcast(io, room, 'round-started', {
    round: g.round,
    totalRounds: room.settings.rounds,
    drawerId: g.drawerId,
    drawerName: dname(room, g.drawerId),
    drawerIsBot: isBot(room, g.drawerId),
  });
  bcast(io, room, 'canvas-clear', {});

  if (isBot(room, g.drawerId)) {
    setTimeout(() => botDraw(io, room, words[Math.floor(Math.random() * words.length)]), 2400);
  } else {
    io.to(g.drawerId).emit('word-choices', words);
    g.autoSel = setTimeout(() => {
      if (g.phase === 'word-select') selectWord(io, room, words[0]);
    }, 15000);
  }

  sync(io, room);
}

/**
 * Handle the bot's drawing turn: pick a word, emit strokes, start the timer.
 * @param {import('socket.io').Server} io
 * @param {object} room
 * @param {string} word
 */
function botDraw(io, room, word) {
  const g = room.game;
  g.word = word;
  g.phase = 'drawing';
  g.timeLeft = room.settings.drawTime;
  g.hint = [...word].map(c => (c === ' ' ? '/' : '_')).join(' ');
  g.revealAt = new Set([Math.floor(g.timeLeft * 0.55), Math.floor(g.timeLeft * 0.28)]);

  room.players.forEach(p =>
    io.to(p.id).emit('hint-init', { hint: g.hint, wordLen: word.length, isBotDrawing: true }),
  );
  bcast(io, room, 'phase-change', { phase: 'drawing', drawerIsBot: true });

  const strokes = genStrokes(word);
  let delay = 900;
  strokes.forEach(stroke => {
    setTimeout(() => bcast(io, room, 'bot-stroke', stroke), delay + Math.random() * 180);
    delay += 460 + (stroke.p?.length || 3) * 88;
  });

  startTimer(io, room);
  sync(io, room);
}

/**
 * A human drawer has selected their word — begin the drawing phase.
 * @param {import('socket.io').Server} io
 * @param {object} room
 * @param {string} word
 */
function selectWord(io, room, word) {
  const g = room.game;
  clearTimeout(g.autoSel);
  g.word = word;
  g.phase = 'drawing';
  g.timeLeft = room.settings.drawTime;
  g.hint = [...word].map(c => (c === ' ' ? '/' : '_')).join(' ');
  g.revealAt = new Set([Math.floor(g.timeLeft * 0.55), Math.floor(g.timeLeft * 0.28)]);

  io.to(g.drawerId).emit('word-for-drawer', { word });
  room.players
    .filter(p => p.id !== g.drawerId)
    .forEach(p => io.to(p.id).emit('hint-init', { hint: g.hint, wordLen: word.length, isBotDrawing: false }));
  bcast(io, room, 'phase-change', { phase: 'drawing', drawerIsBot: false });

  startTimer(io, room);
  sync(io, room);
}

/**
 * Start the per-second countdown timer for the current round.
 * @param {import('socket.io').Server} io
 * @param {object} room
 */
function startTimer(io, room) {
  const g = room.game;
  clearInterval(g.timerInt);

  g.timerInt = setInterval(() => {
    g.timeLeft--;
    bcast(io, room, 'timer', g.timeLeft);

    if (g.revealAt?.has(g.timeLeft)) revealLetter(io, room);
    if (g.timeLeft <= 0) {
      clearInterval(g.timerInt);
      endRound(io, room);
    }
  }, 1000);
}

/**
 * Reveal one hidden letter of the hint to non-drawing players.
 * @param {import('socket.io').Server} io
 * @param {object} room
 */
function revealLetter(io, room) {
  const g = room.game;
  if (!g.word || !g.hint) return;

  const chars = g.hint.split(' ');
  const hidden = chars.reduce((acc, c, i) => (c === '_' ? [...acc, i] : acc), []);
  if (!hidden.length) return;

  const idx = hidden[Math.floor(Math.random() * hidden.length)];
  chars[idx] = g.word[idx];
  g.hint = chars.join(' ');

  room.players
    .filter(p => p.id !== g.drawerId && !p.hasGuessed)
    .forEach(p => io.to(p.id).emit('hint-update', g.hint));
}

/**
 * Process a guess from a player or bot.
 * Awards points on correct guess using the formula:
 *   guesser: 60 + (timeLeft / drawTime) × 240
 *   drawer:  flat +60 per correct guesser
 *
 * @param {import('socket.io').Server} io
 * @param {object} room
 * @param {object|null} player - Human player (or null for bot)
 * @param {object|null} bot - Bot (or null for human)
 * @param {string} guess - The guess text (already lowercased + trimmed)
 * @param {string} target - The correct word (lowercased)
 */
function resolveGuess(io, room, player, bot, guess, target) {
  if (!target) return;

  const g = room.game;
  const entity = player || bot;
  // Only exact matches count — partial matching was exploitable
  // (e.g. "butter" matched "butterfly", "cycle" matched "bicycle")
  const isCorrect = guess === target;

  if (isCorrect) {
    entity.hasGuessed = true;
    const pts = Math.round(60 + (g.timeLeft / room.settings.drawTime) * 240);
    entity.score = (entity.score || 0) + pts;
    entity.roundPts = pts;

    const drawer = getPlayer(room, g.drawerId) || getBot(room, g.drawerId);
    if (drawer) {
      drawer.score = (drawer.score || 0) + 60;
      drawer.roundPts = (drawer.roundPts || 0) + 60;
    }

    bcast(io, room, 'correct-guess', { pid: entity.id, name: entity.name, points: pts, isBot: !!bot });
    sync(io, room);

    // Check if every non-drawer has guessed
    const noneLeft = [...room.players, ...room.bots]
      .filter(x => x.id !== g.drawerId && !x.hasGuessed).length === 0;
    if (noneLeft) {
      clearInterval(g.timerInt);
      endRound(io, room);
    }
  } else {
    bcast(io, room, 'wrong-guess', { pid: entity.id, name: entity.name, guess, isBot: !!bot });
  }
}

/**
 * End the current round, show scores, then auto-advance after a delay.
 * @param {import('socket.io').Server} io
 * @param {object} room
 */
function endRound(io, room) {
  const g = room.game;
  clearInterval(g.timerInt);
  clearTimeout(g.autoSel);
  g.phase = 'round-end';

  const scores = [
    ...room.players.map(p => ({
      id: p.id, name: p.name, avatar: ini(p.name),
      score: p.score, roundPts: p.roundPts || 0, isBot: false,
    })),
    ...room.bots.map(b => ({
      id: b.id, name: b.name, avatar: b.avatar, emoji: b.emoji,
      score: b.score || 0, roundPts: b.roundPts || 0, isBot: true,
    })),
  ].sort((a, b) => b.score - a.score);

  bcast(io, room, 'round-ended', {
    word: g.word, round: g.round, totalRounds: room.settings.rounds, scores,
  });
  sync(io, room);

  setTimeout(() => {
    try { startRound(io, room); } catch (err) { console.error('[gameLoop] startRound error:', err); }
  }, 6500);
}

/**
 * End the entire game, broadcast final standings, schedule room cleanup.
 * @param {import('socket.io').Server} io
 * @param {object} room
 */
function endGame(io, room) {
  clearInterval(room.game.timerInt);
  room.game.phase = 'game-end';

  const scores = [
    ...room.players.map(p => ({
      id: p.id, name: p.name, avatar: ini(p.name), score: p.score, isBot: false,
    })),
    ...room.bots.map(b => ({
      id: b.id, name: b.name, avatar: b.avatar, emoji: b.emoji, score: b.score || 0, isBot: true,
    })),
  ]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  bcast(io, room, 'game-ended', { scores });
  sync(io, room);

  // Auto-delete the room after 10 minutes of inactivity
  room.game.cleanupTimeout = setTimeout(() => deleteRoom(room.code), 10 * 60 * 1000);
}

module.exports = {
  sync, startRound, selectWord, resolveGuess, endRound, endGame,
};
