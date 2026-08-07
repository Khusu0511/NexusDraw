import { CW, CH } from '../utils/helpers';

export default function Canvas({ canvasRef, cursorRef, aiChipRef, isDrawer, isBotDrawing }) {
  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvasRef}
        id="cv"
        width={CW}
        height={CH}
        className={isDrawer ? 'drawing' : ''}
      />
      <div ref={aiChipRef} className="ai-chip" />
      {isBotDrawing && (
        <div className="drawer-badge">🤖 Drawing…</div>
      )}
      <div ref={cursorRef} id="cur" />
    </div>
  );
}
