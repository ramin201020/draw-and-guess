import React, { useState } from 'react';

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A'
];

export function CanvasDrawingToolbar({ 
  isDrawer, 
  selectedTool, 
  onToolChange, 
  selectedColor, 
  onColorChange, 
  brushSize, 
  onBrushSizeChange, 
  onClearCanvas 
}) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isDrawer) return null;

  return (
    <div className={`canvas-drawing-toolbar ${isMinimized ? 'minimized' : ''}`}>
      <button 
        className="toolbar-toggle-btn"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        🎨
      </button>
      
      <div className="toolbar-content">
        {/* Tools */}
        <div className="tool-group">
          <button 
            className={`tool-btn ${selectedTool === 'brush' ? 'active' : ''}`}
            onClick={() => onToolChange('brush')}
            title="Brush"
          >
            ✏️
          </button>
          <button 
            className={`tool-btn ${selectedTool === 'eraser' ? 'active' : ''}`}
            onClick={() => onToolChange('eraser')}
            title="Eraser"
          >
            🧽
          </button>
        </div>

        {/* Colors */}
        <div className="color-palette">
          {COLORS.map(color => (
            <button
              key={color}
              className={`color-btn ${selectedColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
              title={color}
            />
          ))}
        </div>

        {/* Brush Size */}
        <div className="brush-size-control">
          <span style={{ fontSize: '9px' }}>Size:</span>
          <input
            type="range"
            min="2"
            max="20"
            value={brushSize}
            onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
            className="brush-size-slider"
          />
          <span style={{ fontSize: '9px' }}>{brushSize}px</span>
        </div>

        {/* Actions */}
        <div className="action-buttons">
          <button 
            className="action-btn clear-btn"
            onClick={onClearCanvas}
            title="Clear Canvas"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}