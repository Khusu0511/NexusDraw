/**
 * Socket.io event handlers.
 *
 * Registers all client-facing events (create-room, join-room, guess, stroke, …)
 * on a per-connection basis. Keeps transport logic separate from game rules.
 */

const {
  genCode, getRoom, setRoom, deleteRoom, hasRoom,
  getPlayer, getBot, isBot, freshGame, snapshot,
} = require('./roomManager');
const { sync, startRound, selectWord, resolveGuess, endRound } = require('./gameLoop');
const { clean, ini, parseSettings } = require('../utils');

/** Maximum events per second per socket for rate-limited actions. */
const RATE_LIMIT = 10;

/**
 * Register all event handlers for a single socket connection.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerHandlers(io, socket) {
  socket.data.rc = null;

  // ── Simple per-socket rate limiter ──────────────────────────────────
  const rateBuckets = {};
  function rateOk(event) {
    const now = Date.now();
    const bucket = rateBuckets[event] || { count: 0, reset: now + 1000 };
    if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + 1000; }
    bucket.count++;
    rateBuckets[event] = bucket;
    return bucket.count <= RATE_LIMIT;
  }

  // ── Room creation ───────────────────────────────────────────────────
  socket.on('create-room', ({ name, settings = {}, addBot = false }) => {
    try {
      const code = genCode();
      const room = {
        code,
        host: socket.id,
        settings: parseSettings(settings),
        players: [],
        bots: addBot
          ? [{
            name: 'AI', avatar: 'AI', emoji: '🤖', type: 'ai',
            id: `bot_ai_${Date.now().toString(36)}`,
            score: 0, roundPts: 0, hasGuessed: false,
            confidence: 0.38, paceMs: 7000,
          }]
          : [],
        game: freshGame(),
      };

      setRoom(code, room);
      join(socket, room, name);
      socket.emit('room-created', { code, room: snapshot(room) });
      sync(io, room);
    } catch (err) {
      console.error('[socketHandlers] create-room error:', err);
      socket.emit('join-error', 'Failed to create room');
    }
  });

  // ── Room joining ────────────────────────────────────────────────────
  socket.on('join-room', ({ code, name }) => {
    try {
      const room = getRoom(code?.toUpperCase());
      if (!room) { socket.emit('join-error', 'Room not found'); return; }
      if (room.game.phase !== 'waiting' && room.game.phase !== 'game-end') { socket.emit('join-error', 'Game already in progress'); return; }
      if (room.players.length >= room.settings.maxPlayers) { socket.emit('join-error', 'Room is full'); return; }

      join(socket, room, name);
      socket.emit('room-joined', { room: snapshot(room) });
      bcast(io, room, 'player-joined', { id: socket.id, name: clean(name), avatar: ini(name) });
      sync(io, room);
    } catch (err) {
      console.error('[socketHandlers] join-room error:', err);
      socket.emit('join-error', 'Failed to join room');
    }
  });

  // ── Settings update (host only) ────────────────────────────────────
  socket.on('update-settings', s => {
    const r = getRoom(socket.data.rc);
    if (!r || r.host !== socket.id) return;
    r.settings = parseSettings(s);
    sync(io, r);
  });

  // ── Game start (host only) ─────────────────────────────────────────
  socket.on('start-game', () => {
    const r = getRoom(socket.data.rc);
    if (!r || r.host !== socket.id) return;
    if (r.players.length + r.bots.length < 2) {
      socket.emit('join-error', 'Need at least 2 players');
      return;
    }
    r.players.forEach(p => { p.score = 0; p.roundPts = 0; });
    r.bots.forEach(b =>    { b.score = 0; b.roundPts = 0; });
    r.game.round = 0;
    r.game.drawerIdx = 0;
    bcast(io, r, 'game-started', {});
    startRound(io, r);
  });

  // ── Word selection ─────────────────────────────────────────────────
  socket.on('select-word', word => {
    const r = getRoom(socket.data.rc);
    if (!r || r.game.drawerId !== socket.id || !r.game.wordChoices.includes(word)) return;
    selectWord(io, r, word);
  });

  // ── Drawing events (drawer only) ──────────────────────────────────
  socket.on('stroke', d => {
    const r = getRoom(socket.data.rc);
    if (r && r.game.drawerId === socket.id) socket.to(r.code).emit('stroke', d);
  });

  socket.on('fill', d => {
    const r = getRoom(socket.data.rc);
    if (r && r.game.drawerId === socket.id) socket.to(r.code).emit('fill', d);
  });

  socket.on('undo', () => {
    const r = getRoom(socket.data.rc);
    if (r && r.game.drawerId === socket.id) socket.to(r.code).emit('undo');
  });

  socket.on('clear', () => {
    const r = getRoom(socket.data.rc);
    if (r && r.game.drawerId === socket.id) socket.to(r.code).emit('canvas-clear');
  });

  // ── Bot guess (relayed by the client running inference) ────────────
  socket.on('bot-guess', ({ botId, guess }) => {
    if (!rateOk('bot-guess')) return;
    const r = getRoom(socket.data.rc);
    if (!r) return;
    const bot = getBot(r, botId);
    if (!bot || bot.hasGuessed || botId === r.game.drawerId || r.game.phase !== 'drawing') return;
    resolveGuess(io, r, null, bot, String(guess).trim().toLowerCase().slice(0, 100), r.game.word?.toLowerCase());
  });

  // ── Human guess (rate-limited) ─────────────────────────────────────
  socket.on('guess', text => {
    if (!rateOk('guess')) return;
    const r = getRoom(socket.data.rc);
    if (!r) return;
    const p = getPlayer(r, socket.id);
    if (!p || p.hasGuessed || socket.id === r.game.drawerId || r.game.phase !== 'drawing') return;
    resolveGuess(io, r, p, null, String(text).trim().toLowerCase().slice(0, 100), r.game.word?.toLowerCase());
  });

  // ── Chat (rate-limited) ────────────────────────────────────────────
  socket.on('chat', text => {
    if (!rateOk('chat')) return;
    const r = getRoom(socket.data.rc);
    if (!r) return;
    const p = getPlayer(r, socket.id);
    let chatText = String(text).slice(0, 200);
    // Censor the secret word if the drawer accidentally types it
    if (r.game.word && r.game.drawerId === socket.id) {
      const re = new RegExp(r.game.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      chatText = chatText.replace(re, '***');
    }
    bcast(io, r, 'chat', { id: socket.id, name: p?.name || '?', text: chatText });
  });

  // ── Kick player (host only) ────────────────────────────────────────
  socket.on('kick', tid => {
    const r = getRoom(socket.data.rc);
    if (!r || r.host !== socket.id || tid === socket.id) return;
    const target = io.sockets.sockets.get(tid);
    if (target) {
      target.emit('kicked');
      remove(target, r);
    }
  });

  // ── Restart game (host only, after game-end) ───────────────────────
  socket.on('restart', () => {
    const r = getRoom(socket.data.rc);
    if (!r || r.host !== socket.id || r.game.phase !== 'game-end') return;
    r.players.forEach(p => { p.score = 0; p.roundPts = 0; });
    r.bots.forEach(b =>    { b.score = 0; b.roundPts = 0; });
    clearTimeout(r.game.cleanupTimeout);
    r.game = freshGame();  // freshGame() resets drawerIdx to 0
    bcast(io, r, 'game-started', {});
    startRound(io, r);
  });

  // ── Disconnect / Leave cleanup ─────────────────────────────────────
  socket.on('disconnect', () => {
    const r = getRoom(socket.data.rc);
    if (r) remove(socket, r);
  });

  socket.on('leave-room', () => {
    const r = getRoom(socket.data.rc);
    if (r) remove(socket, r);
  });

  // ── Internal helpers ───────────────────────────────────────────────

  /** Add a socket to a room as a new player. */
  function join(sock, room, name) {
    sock.data.rc = room.code;
    sock.join(room.code);
    room.players.push({
      id: sock.id,
      name: clean(name),
      score: 0,
      roundPts: 0,
      hasGuessed: false,
      avatar: ini(name),
    });
  }

  /** Remove a socket from a room and handle host transfer / mid-draw cleanup. */
  function remove(sock, room) {
    room.players = room.players.filter(p => p.id !== sock.id);
    sock.leave(room.code);
    sock.data.rc = null;

    if (!room.players.length) {
      deleteRoom(room.code);
      return;
    }

    bcast(io, room, 'player-left', sock.id);

    // Transfer host if needed
    if (room.host === sock.id && room.players.length) {
      room.host = room.players[0].id;
      io.to(room.host).emit('host-promoted');
    }

    const totalParticipants = room.players.length + room.bots.length;

    if (room.game.phase !== 'waiting' && room.game.phase !== 'game-end' && totalParticipants < 2) {
      // Abort game and return to lobby if not enough players to continue
      clearInterval(room.game.timerInt);
      clearTimeout(room.game.autoSel);
      room.game = freshGame();
      bcast(io, room, 'chat', { id: 'system', name: 'System', text: 'Game aborted: Not enough players.' });
    } else if (room.game.drawerId === sock.id && room.game.phase === 'drawing') {
      // If the drawer left mid-round, end the round immediately
      clearInterval(room.game.timerInt);
      endRound(io, room);
    } else if (room.game.phase === 'drawing') {
      // If a guesser left, check if all remaining guessers have already guessed
      const noneLeft = [...room.players, ...room.bots]
        .filter(x => x.id !== room.game.drawerId && !x.hasGuessed).length === 0;
      if (noneLeft) {
        clearInterval(room.game.timerInt);
        endRound(io, room);
      }
    }

    sync(io, room);
  }

  /** Broadcast helper scoped to this handler. */
  function bcast(io, room, event, data) {
    io.to(room.code).emit(event, data);
  }
}

module.exports = { registerHandlers };
