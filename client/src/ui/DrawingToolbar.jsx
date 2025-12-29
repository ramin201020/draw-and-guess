import React, { useState } from 'react';

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A',
  '#808080', '#C0C0C0', '#800000', '#008000', '#000080', '#808000',
  '#800080', '#008080', '#FF6347', '#4682B4'
];

const BRUSH_SIZES = [2, 4, 6, 8, 12, 16, 20, 24];

export function DrawingToolbar({
  isDrawer,
  currentTool,
  currentColor,
  brushSize,
  canvasBackground,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onBackgroundChange,
  onClearCanvas
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushSizes, setShowBrushSizes] = useState(false);

  if (!isDrawer) {
    return (
      <div className="drawing-toolbar spectator">
        <div className="toolbar-hint">
          <span>👀 Watching</span>
          <p>Type your guess in the chat!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="drawing-toolbar">
      <div className="toolbar-section">
        <h4>Tools</h4>
        <div className="tool-buttons">
          <button
            className={`tool-btn ${currentTool === 'BRUSH' ? 'active' : ''}`}
            onClick={() => onToolChange('BRUSH')}
            title="Brush"
          >
            ✏️
          </button>
          <button
            className={`tool-btn ${currentTool === 'ERASER' ? 'active' : ''}`}
            onClick={() => onToolChange('ERASER')}
            title="Eraser"
          >
            🧽
          </button>
          <button
            className="tool-btn clear-btn"
            onClick={onClearCanvas}
            title="Clear Canvas"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <h4>Color</h4>
        <div className="color-section">
          <button
            className="current-color-btn"
            style={{ backgroundColor: currentColor }}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Choose Color"
          />
          {showColorPicker && (
            <div className="color-picker">
              <div className="color-grid">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${currentColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      onColorChange(color);
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-section">
        <h4>Brush Size</h4>
        <div className="brush-section">
          <button
            className="brush-size-btn"
            onClick={() => setShowBrushSizes(!showBrushSizes)}
            title="Choose Brush Size"
          >
            <div 
              className="brush-preview" 
              style={{ 
                width: Math.min(brushSize, 20), 
                height: Math.min(brushSize, 20),
                backgroundColor: currentColor 
              }}
            />
            <span>{brushSize}px</span>
          </button>
          {showBrushSizes && (
            <div className="brush-sizes">
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size}
                  className={`brush-size-option ${brushSize === size ? 'selected' : ''}`}
                  onClick={() => {
                    onBrushSizeChange(size);
                    setShowBrushSizes(false);
                  }}
                >
                  <div 
                    className="brush-preview" 
                    style={{ 
                      width: Math.min(size, 20), 
                      height: Math.min(size, 20),
                      backgroundColor: currentColor 
                    }}
                  />
                  <span>{size}px</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-section">
        <h4>Background</h4>
        <div className="background-buttons">
          <button
            className={`bg-btn ${canvasBackground === 'light' ? 'active' : ''}`}
            onClick={() => onBackgroundChange('light')}
            title="Light Background"
          >
            ☀️
          </button>
          <button
            className={`bg-btn ${canvasBackground === 'dark' ? 'active' : ''}`}
            onClick={() => onBackgroundChange('dark')}
            title="Dark Background"
          >
            🌙
          </button>
        </div>
      </div>
    </div>
  );
}