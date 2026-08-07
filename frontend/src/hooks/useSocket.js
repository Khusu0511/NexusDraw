/**
 * useSocket — React hook for Socket.io connection and event management.
 *
 * Provides a stable socket instance and helpers to emit events.
 * All incoming events dispatch to a handler in App.jsx via a ref-based
 * callback pattern that avoids stale closures.
 */

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

/**
 * All socket events we listen for.
 * Keeping them in a flat array avoids duplicating .on() boilerplate.
 */
const EVENTS = [
  'connect',
  // Room lifecycle
  'room-created', 'room-joined', 'join-error', 'room-update',
  'player-joined', 'player-left', 'host-promoted', 'kicked',
  // Game lifecycle
  'game-started', 'round-started', 'word-choices', 'word-for-drawer',
  'hint-init', 'hint-update', 'phase-change', 'timer',
  // Drawing
  'stroke', 'fill', 'undo', 'canvas-clear', 'bot-stroke',
  // Guessing
  'correct-guess', 'wrong-guess', 'chat', 'round-ended', 'game-ended',
];

export default function useSocket({ onEvent }) {
  const socketRef = useRef(null);

  // ── Ref always points to the LATEST onEvent callback ────────────
  // This solves the stale-closure problem: socket listeners are
  // registered once but always call the current version of onEvent.
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    // Special case: 'connect' passes socket.id
    socket.on('connect', () => onEventRef.current('connect', { id: socket.id }));

    // Register all other events via the ref
    EVENTS.filter((e) => e !== 'connect').forEach((event) => {
      socket.on(event, (data) => onEventRef.current(event, data));
    });

    return () => { socket.disconnect(); };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socketRef, emit };
}
