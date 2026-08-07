/**
 * useCanvas — React hook for canvas drawing logic.
 *
 * Manages mouse/touch event handlers, drawing state, undo history,
 * flood fill, and the custom cursor. Returns a ref to attach to the canvas.
 */

import { useRef, useCallback, useEffect } from 'react';
import { CW, CH } from '../utils/helpers';

export default function useCanvas({ isDrawer, emit }) {
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const drawState = useRef({
    tool: 'pen',
    color: '#111111',
    size: 7,
    active: false,
    pts: [],
    hist: [],
  });
  // Remote stroke state
  const remoteState = useRef({ pts: [], color: '#111', size: 7, tool: 'pen' });

  const getCtx = useCallback(() => canvasRef.current?.getContext('2d'), []);

  const clearCanvas = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, CW, CH);
  }, [getCtx]);

  const initCanvas = useCallback(() => {
    clearCanvas();
    drawState.current.hist = [];
    drawState.current.pts = [];
    remoteState.current.pts = [];
  }, [clearCanvas]);

  const saveSnapshot = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    drawState.current.hist.push(ctx.getImageData(0, 0, CW, CH));
    if (drawState.current.hist.length > 35) drawState.current.hist.shift();
  }, [getCtx]);

  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches?.[0] ?? e;
    return {
      x: (src.clientX - rect.left) * CW / rect.width,
      y: (src.clientY - rect.top) * CH / rect.height,
    };
  }, []);

  // ── Flood fill ──────────────────────────────────────────────────────
  const applyFill = useCallback((sx, sy, fillColor) => {
    saveSnapshot();
    const ctx = getCtx();
    const img = ctx.getImageData(0, 0, CW, CH);
    const d = img.data;
    const gp = (x, y) => { const i = (y * CW + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const sp = (x, y, r, g, b) => { const i = (y * CW + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; };
    const hex = fillColor.replace('#', '');
    const [fr, fg, fb] = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    const tgt = gp(Math.round(sx), Math.round(sy));
    const near = (p) => Math.abs(p[0] - tgt[0]) + Math.abs(p[1] - tgt[1]) + Math.abs(p[2] - tgt[2]) < 22;
    if (near([fr, fg, fb])) return;
    const stk = [[Math.round(sx), Math.round(sy)]];
    let n = 0;
    while (stk.length && n++ < 200000) {
      const [x, y] = stk.pop();
      if (x < 0 || y < 0 || x >= CW || y >= CH || !near(gp(x, y))) continue;
      sp(x, y, fr, fg, fb);
      stk.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    ctx.putImageData(img, 0, 0);
  }, [getCtx, saveSnapshot]);

  // ── Undo / Clear ────────────────────────────────────────────────────
  const doUndo = useCallback(() => {
    if (!drawState.current.hist.length) return;
    getCtx().putImageData(drawState.current.hist.pop(), 0, 0);
    emit('undo');
  }, [getCtx, emit]);

  const doClear = useCallback(() => {
    saveSnapshot();
    clearCanvas();
    emit('clear');
  }, [saveSnapshot, clearCanvas, emit]);

  // ── Tool / Color / Size setters ─────────────────────────────────────
  const setTool = useCallback((tool) => { drawState.current.tool = tool; }, []);
  const setColor = useCallback((color) => { drawState.current.color = color; drawState.current.tool = 'pen'; }, []);
  const setSize = useCallback((size) => { drawState.current.size = size; }, []);

  // ── Remote drawing handlers ─────────────────────────────────────────
  const handleRemoteStroke = useCallback(({ t, x, y, c, sz, tool }) => {
    const px = x * CW, py = y * CH;
    const ctx = getCtx();
    if (!ctx) return;
    const R = remoteState.current;
    if (t === 's') {
      R.color = c; R.size = sz * CW; R.tool = tool; R.pts = [{ x: px, y: py }];
    } else if (t === 'm') {
      R.pts.push({ x: px, y: py });
      if (R.pts.length >= 3) {
        const a = R.pts[R.pts.length - 3], b = R.pts[R.pts.length - 2], c2 = R.pts[R.pts.length - 1];
        ctx.beginPath();
        ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
        ctx.quadraticCurveTo(b.x, b.y, (b.x + c2.x) / 2, (b.y + c2.y) / 2);
        ctx.strokeStyle = R.tool === 'eraser' ? '#fff' : R.color;
        ctx.lineWidth = R.size;
        ctx.lineCap = ctx.lineJoin = 'round';
        ctx.stroke();
      }
    } else { R.pts = []; }
  }, [getCtx]);

  const handleRemoteFill = useCallback(({ x, y, color }) => {
    applyFill(x * CW, y * CH, color);
  }, [applyFill]);

  const handleRemoteUndo = useCallback(() => {
    if (drawState.current.hist.length) {
      getCtx().putImageData(drawState.current.hist.pop(), 0, 0);
    }
  }, [getCtx]);

  const handleBotStroke = useCallback(({ c, s, p }) => {
    if (!p?.length) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = c;
    ctx.lineWidth = s * CW;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.moveTo(p[0].x * CW, p[0].y * CH);
    p.forEach((pt) => ctx.lineTo(pt.x * CW, pt.y * CH));
    ctx.stroke();
  }, [getCtx]);

  // ── Mouse / Touch event setup ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e) => {
      if (!isDrawer) return;
      e.preventDefault();
      const pos = getPos(e);
      const D = drawState.current;
      if (D.tool === 'fill') {
        applyFill(pos.x, pos.y, D.color);
        emit('fill', { x: pos.x / CW, y: pos.y / CH, color: D.color });
        return;
      }
      saveSnapshot();
      D.active = true;
      D.pts = [pos];
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, (D.tool === 'eraser' ? D.size * 2 : D.size) / 2, 0, Math.PI * 2);
      ctx.fillStyle = D.tool === 'eraser' ? '#fff' : D.color;
      ctx.fill();
      emit('stroke', { t: 's', x: pos.x / CW, y: pos.y / CH, c: D.color, sz: D.size / CW, tool: D.tool });
    };

    const onMouseMove = (e) => {
      // Update cursor
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX + 'px';
        cursorRef.current.style.top = e.clientY + 'px';
        if (isDrawer) {
          cursorRef.current.style.display = 'block';
          const sc = canvas.getBoundingClientRect().width / CW;
          const D = drawState.current;
          const sz = (D.tool === 'eraser' ? D.size * 2 : D.size) * sc;
          cursorRef.current.style.width = sz + 'px';
          cursorRef.current.style.height = sz + 'px';
          cursorRef.current.style.borderColor = D.tool === 'eraser' ? 'rgba(255,50,50,.6)' : 'rgba(0,0,0,.45)';
        } else {
          cursorRef.current.style.display = 'none';
        }
      }
      const D = drawState.current;
      if (!D.active || !isDrawer) return;
      e.preventDefault();
      const pos = getPos(e);
      D.pts.push(pos);
      if (D.pts.length >= 3) {
        const a = D.pts[D.pts.length - 3], b = D.pts[D.pts.length - 2], c2 = D.pts[D.pts.length - 1];
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
        ctx.quadraticCurveTo(b.x, b.y, (b.x + c2.x) / 2, (b.y + c2.y) / 2);
        ctx.strokeStyle = D.tool === 'eraser' ? '#fff' : D.color;
        ctx.lineWidth = D.tool === 'eraser' ? D.size * 2 : D.size;
        ctx.lineCap = ctx.lineJoin = 'round';
        ctx.stroke();
      }
      emit('stroke', { t: 'm', x: pos.x / CW, y: pos.y / CH });
    };

    const stopDrawing = () => {
      if (!drawState.current.active) return;
      drawState.current.active = false;
      drawState.current.pts = [];
      emit('stroke', { t: 'e' });
    };

    const onMouseLeave = () => {
      stopDrawing();
      if (cursorRef.current) cursorRef.current.style.display = 'none';
    };

    const onTouchStart = (e) => {
      if (!isDrawer) return;
      e.preventDefault();
      const t = e.touches[0];
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY }));
    };

    const onTouchMove = (e) => {
      if (!isDrawer) return;
      e.preventDefault();
      const t = e.touches[0];
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY }));
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [isDrawer, getPos, saveSnapshot, applyFill, emit]);

  return {
    canvasRef, cursorRef, drawState,
    initCanvas, clearCanvas, applyFill,
    doUndo, doClear,
    setTool, setColor, setSize,
    handleRemoteStroke, handleRemoteFill, handleRemoteUndo, handleBotStroke,
  };
}
