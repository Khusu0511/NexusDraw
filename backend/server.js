/**
 * NexusDraw — Backend Entry Point
 *
 * Express + Socket.io API server for the multiplayer drawing game.
 * In production, also serves the React frontend build from ../frontend/dist/.
 * In development, the Vite dev server handles the frontend separately.
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { registerHandlers } = require('./src/game/socketHandlers');

// ── Express setup ────────────────────────────────────────────────────
const app = express();
const http = createServer(app);

const IS_PROD = process.env.NODE_ENV === 'production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || (IS_PROD ? undefined : 'http://localhost:5173');

const io = new Server(http, {
  cors: {
    origin: CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// ── Security headers ─────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "connect-src 'self' ws: wss: blob:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    "worker-src blob: 'self';",
  );
  next();
});

// ── In production, serve the React build ─────────────────────────────
if (IS_PROD) {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    // Let /health and API routes pass through
    if (req.path === '/health') return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ── Health check ─────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, uptime: process.uptime() }));

// ── Socket.io ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  registerHandlers(io, socket);
});

// ── Start server ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

http.listen(PORT, () => {
  console.log(`\n  ⬡  Nexus Draw API  →  http://localhost:${PORT}`);
  if (IS_PROD) console.log('  📦  Serving frontend from ../frontend/dist/');
  else console.log('  🔧  Dev mode — frontend at http://localhost:5173');
  console.log();
});
