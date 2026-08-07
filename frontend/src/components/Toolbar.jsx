import { useState } from 'react';
import { PALETTE, BRUSH_SIZES } from '../utils/helpers';

export default function Toolbar({ isDrawer, drawState, setTool, setColor, setSize, doUndo, doClear }) {
  const [activeColor, setActiveColor] = useState('#111111');
  const [activeSize, setActiveSize] = useState(7);
  const [activeTool, setActiveTool] = useState('pen');

  const handleColor = (c) => {
    setActiveColor(c);
    setActiveTool('pen');
    setColor(c);
    setTool('pen');
  };

  const handleSize = (s) => {
    setActiveSize(s);
    setSize(s);
  };

  const handleTool = (t) => {
    setActiveTool(t);
    setTool(t);
  };

  return (
    <div className={`toolbar${!isDrawer ? ' locked' : ''}`} id="toolbar">
      {/* Palette */}
      <div className="palette">
        {PALETTE.map((c) => (
          <div
            key={c}
            className={`color-swatch${c === activeColor ? ' active' : ''}${c === '#ffffff' ? ' color-swatch--white' : ''}`}
            style={{ background: c }}
            onClick={() => handleColor(c)}
          />
        ))}
      </div>

      <div className="toolbar-sep" />

      {/* Sizes */}
      <div className="size-group">
        {BRUSH_SIZES.map((s) => (
          <div
            key={s}
            className={`size-btn${s === activeSize ? ' active' : ''}`}
            onClick={() => handleSize(s)}
          >
            <div
              className="size-dot"
              style={{ width: Math.min(s * 0.85, 18), height: Math.min(s * 0.85, 18) }}
            />
          </div>
        ))}
      </div>

      <div className="toolbar-sep" />

      {/* Tools */}
      <div className="tool-group">
        <button
          className={`tool-btn${activeTool === 'pen' ? ' active' : ''}`}
          onClick={() => handleTool('pen')}
        >
          Pen
        </button>
        <button
          className={`tool-btn${activeTool === 'eraser' ? ' active' : ''}`}
          onClick={() => handleTool('eraser')}
        >
          Eraser
        </button>
        <button
          className={`tool-btn${activeTool === 'fill' ? ' active' : ''}`}
          onClick={() => handleTool('fill')}
        >
          Fill
        </button>
      </div>

      <div className="toolbar-sep" />

      {/* Actions */}
      <button className="action-btn" onClick={doUndo}>↩ Undo</button>
      <button className="action-btn" onClick={doClear}>✕ Clear</button>
    </div>
  );
}
