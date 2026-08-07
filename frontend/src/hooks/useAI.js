/**
 * useAI — React hook for TensorFlow.js model inference.
 *
 * Loads the CNN model on mount, runs periodic predictions during
 * drawing phase, and handles bot guessing logic.
 *
 * The CNN expects 28×28 single-channel images (trained on Quick Draw data
 * where strokes are ~1.0 on a ~0.0 background). The preprocessing pipeline:
 *  1. Crop to bounding box with padding
 *  2. Center by center-of-mass (matching Quick Draw dataset convention)
 *  3. Downsample to 28×28 using smooth progressive halving to preserve
 *     thin strokes during the ~30× size reduction
 *  4. Convert to greyscale using min-channel (not luminance) so colored
 *     strokes on white backgrounds produce strong signal
 *  5. Invert values (white bg → 0, strokes → high) with light noise floor
 */

import { useRef, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import { CNN_CATEGORIES, CW, CH } from '../utils/helpers';

export default function useAI({ canvasRef, isDrawer, phase, botRef, emit }) {
  const modelRef = useRef(null);
  const loopRef = useRef(null);
  const aiChipRef = useRef(null);
  const botStateRef = useRef({ lastGuess: 0, wrong: [], startTime: 0 });

  // ── Load model on mount ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const model = await tf.loadLayersModel('/model/model.json');
        if (!cancelled) modelRef.current = model;
      } catch (e) {
        console.warn('[AI] Failed to load model:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Run single inference ────────────────────────────────────────────
  const runPrediction = useCallback(async () => {
    const model = modelRef.current;
    const canvas = canvasRef.current;
    if (!model || !canvas) return [];

    const ctx = canvas.getContext('2d');
    const fd = ctx.getImageData(0, 0, CW, CH).data;

    // Find bounding box of drawn content and compute center-of-mass.
    // Use min-channel deviation from white to detect ANY colored stroke,
    // not just dark ones. A bright yellow stroke (255,220,0) has
    // min-channel 0, so it's clearly detected.
    let x0 = CW, y0 = CH, x1 = 0, y1 = 0, found = false;
    let massX = 0, massY = 0, totalMass = 0;
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        const i = (y * CW + x) * 4;
        const minCh = Math.min(fd[i], fd[i + 1], fd[i + 2]);
        const maxCh = Math.max(fd[i], fd[i + 1], fd[i + 2]);
        // Pixel is non-white if any channel deviates significantly from 255
        // OR if there's a large spread between channels (saturated color)
        if (minCh < 220 || (255 - minCh) + (maxCh - minCh) > 50) {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y);
          x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          found = true;
          // Weight for center-of-mass: how far from white (stronger strokes weigh more)
          const weight = 1.0 - minCh / 255;
          massX += x * weight;
          massY += y * weight;
          totalMass += weight;
        }
      }
    }
    if (!found) return [];

    // Crop and center by center-of-mass in a padded square.
    // The Quick Draw dataset centers drawings by center of mass, not
    // bounding box center. This significantly improves alignment.
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const maxDim = Math.max(w, h);
    const pad = Math.round(maxDim * 0.25);
    const side = maxDim + pad * 2;
    const sq = document.createElement('canvas');
    sq.width = sq.height = side;
    const sqCtx = sq.getContext('2d');
    sqCtx.fillStyle = '#fff';
    sqCtx.fillRect(0, 0, side, side);

    // Compute offset so that center-of-mass lands at center of the square
    const comX = totalMass > 0 ? massX / totalMass : (x0 + x1) / 2;
    const comY = totalMass > 0 ? massY / totalMass : (y0 + y1) / 2;
    const halfSide = side / 2;
    // Place the crop so center-of-mass maps to center of square canvas
    const dx = halfSide - (comX - x0);
    const dy = halfSide - (comY - y0);
    sqCtx.drawImage(canvas, x0, y0, w, h, dx, dy, w, h);

    // Downsample to 28×28 using progressive halving with smooth interpolation.
    // A single-step 30× downscale with nearest-neighbor would destroy thin
    // strokes. Instead, we repeatedly halve the image (each step is only 2×,
    // preserving detail) until we reach near 28px, then do a final smooth
    // resize. All steps use bilinear/bicubic smoothing.
    let cur = sq;
    let curSize = side;
    while (curSize > 56) {
      const next = document.createElement('canvas');
      const nextSize = Math.max(28, Math.round(curSize / 2));
      next.width = next.height = nextSize;
      const nCtx = next.getContext('2d');
      nCtx.imageSmoothingEnabled = true;
      nCtx.imageSmoothingQuality = 'high';
      nCtx.drawImage(cur, 0, 0, nextSize, nextSize);
      cur = next;
      curSize = nextSize;
    }
    // Final resize to exactly 28×28 with smoothing enabled
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = 28;
    const tCtx = tmp.getContext('2d');
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = 'high';
    tCtx.drawImage(cur, 0, 0, 28, 28);

    // Convert to model input: greyscale + invert.
    // Use min-channel (darkest channel) instead of luminance weighting
    // so that colored strokes on white backgrounds produce strong signal.
    // E.g. yellow (#eab308) has luminance ~0.82 → inverted only 0.18,
    // but min-channel = 8/255 ≈ 0.03 → inverted = 0.97 (strong stroke).
    //
    // No hard thresholding — the training data has continuous gradient
    // values (soft anti-aliased edges), not pure binary. Only suppress
    // very faint noise below 0.05 to clean up interpolation artifacts.
    const d = tCtx.getImageData(0, 0, 28, 28).data;
    const px = new Float32Array(28 * 28);
    for (let i = 0; i < 28 * 28; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      const minCh = Math.min(r, g, b);
      // Invert: white(255) → 0, black(0) → 1, colored → strong signal
      const val = 1.0 - minCh / 255;
      // Light noise floor — suppress faint interpolation artifacts only
      px[i] = val < 0.05 ? 0.0 : val;
    }

    // Use tf.tidy to prevent memory leaks
    const probs = tf.tidy(() => {
      const t = tf.tensor4d(px, [1, 28, 28, 1]);
      const out = model.predict(t);
      return out.dataSync(); // synchronous inside tidy
    });

    return CNN_CATEGORIES.map((cat, i) => ({ cat, p: probs[i] })).sort((a, b) => b.p - a.p);
  }, [canvasRef]);

  // ── Stop prediction loop ────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    clearInterval(loopRef.current);
    loopRef.current = null;
    if (aiChipRef.current) aiChipRef.current.classList.remove('show');
  }, []);

  // ── Start prediction loop ──────────────────────────────────────────
  const startLoop = useCallback(() => {
    stopLoop();
    if (!modelRef.current) return;

    loopRef.current = setInterval(async () => {
      const preds = await runPrediction();
      if (!preds.length) return;

      // Update AI chip display for the drawer
      if (isDrawer && aiChipRef.current) {
        aiChipRef.current.textContent = `🤖 ${preds[0].cat} ${Math.round(preds[0].p * 100)}%`;
        aiChipRef.current.classList.add('show');
      }

      // Bot guessing logic — read from ref for latest state.
      // Use an adaptive confidence threshold: start high (fewer wrong
      // guesses early on) and lower it as more drawing is revealed.
      const bot = botRef?.current;
      if (bot && !bot.hasGuessed) {
        const now = Date.now();
        const bs = botStateRef.current;
        if (now - bs.lastGuess >= 5000) {
          // Decay threshold from 0.55 → 0.20 over 30 seconds
          const elapsed = (now - bs.startTime) / 1000;
          const threshold = Math.max(0.20, 0.55 - elapsed * 0.012);
          const pick = preds.find((p) => p.p >= threshold && !bs.wrong.includes(p.cat));
          if (pick) {
            bs.lastGuess = now;
            bs.wrong.push(pick.cat);
            emit('bot-guess', { botId: bot.id, guess: pick.cat });
          }
        }
      }
    }, 1200);
  }, [runPrediction, isDrawer, botRef, emit, stopLoop]);

  const resetBotState = useCallback(() => {
    botStateRef.current = { lastGuess: 0, wrong: [], startTime: Date.now() };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { clearInterval(loopRef.current); };
  }, []);

  return { aiChipRef, startLoop, stopLoop, resetBotState };
}
