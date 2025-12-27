import React, { useState } from 'react';

const COLOR_SWATCHES = [
  '#002855',
  '#1d4ed8',
  '#0ea5e9',
  '#10b981',
  '#f97316',
  '#f43f5e',
  '#a855f7',
  '#ec4899',
  '#facc15',
  '#7c3aed',
  '#111827',
  '#ffffff'
];

const CANVAS_BACKGROUNDS = [
  { name: 'White', value: 'light', color: '#ffffff' },
  { name: 'Light Gray', value: 'gray', color: '#f5f5f5' },
  { name: 'Beige', value: 'beige', color: '#f9f7f4' },
  { name: 'Dark', value: 'dark', color: '#0d0d1a' }
];

export function DrawingToolbar({ 
  isDrawer, 
  onToolChange, 
  onColorChange, 
  onBrushSizeChange, 
  onBackgroundChange,
  onClearCanvas,
  currentTool = 'BRUSH',
  currentColor = COLOR_SWATCHES[0],
  brushSize = 6,
  canvasBackground = 'light'
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToolClick = (tool) => {
    onToolChange?.(tool);
  };

  const handleColorClick = (color) => {
    onColorChange?.(color);
    if (currentTool === 'ERASER' || currentTool === 'FILL') {
      onToolChange?.('BRUSH');
    }
  };

  const handleBrushSizeChange = (e) => {
    onBrushSizeChange?.(Number(e.target.value));
  };

  const handleBackgroundClick = (bg) => {
    onBackgroundChange?.(bg.value);
  };

  if (!isDrawer) {
    return (
      <div className="drawing-toolbar">
        <div className="hint-text">You are spectating - only the drawer can use tools</div>
      </div>
    );
  }

  return (
    <div className="drawing-toolbar">
      {/* Tool Selection */}
      <div className="toolbar-group">
        <button
          className={currentTool === 'BRUSH' ? 'tool-button active' : 'tool-button'}
          onClick={() => handleToolClick('BRUSH')}
        >
          🖌️ {!isMobile && 'Brush'}
        </button>
        <button
          className={currentTool === 'ERASER' ? 'tool-button active' : 'tool-button'}
          onClick={() => handleToolClick('ERASER')}
        >
          🧽 {!isMobile && 'Eraser'}
        </button>
        <button
          className={currentTool === 'FILL' ? 'tool-button active' : 'tool-button'}
          onClick={() => handleToolClick('FILL')}
        >
          🪣 {!isMobile && 'Fill'}
        </button>
      </div>

      {/* Brush Size Control */}
      {currentTool !== 'FILL' && (
        <div className="toolbar-group size-control">
          <label htmlFor="brush-size">{isMobile ? 'Size' : 'Brush Size'}</label>
          <input
            id="brush-size"
            type="range"
            min="2"
            max="28"
            value={brushSize}
            onChange={handleBrushSizeChange}
          />
          <span>{brushSize}px</span>
        </div>
      )}

      {/* Color Swatches */}
      <div className="swatch-grid">
        {COLOR_SWATCHES.map((hex) => (
          <button
            key={hex}
            className={currentTool !== 'ERASER' && currentColor === hex ? 'swatch active' : 'swatch'}
            style={{ backgroundColor: hex }}
            onClick={() => handleColorClick(hex)}
            title={`Color: ${hex}`}
          />
        ))}
        <label className="swatch custom">
          <span>{isMobile ? '🎨' : 'Custom'}</span>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => handleColorClick(e.target.value)}
          />
        </label>
      </div>

      {/* Canvas Background */}
      <div className="toolbar-group canvas-bg-selector">
        <label>{isMobile ? 'BG:' : 'Canvas:'}</label>
        {CANVAS_BACKGROUNDS.map((bg) => (
          <button
            key={bg.value}
            className={`canvas-bg-option ${bg.value} ${canvasBackground === bg.value ? 'active' : ''}`}
            onClick={() => handleBackgroundClick(bg)}
            title={bg.name}
            style={{ backgroundColor: bg.color }}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="toolbar-group">
        <button className="secondary-btn" onClick={onClearCanvas}>
          {isMobile ? '🗑️' : '🗑️ Clear'}
        </button>
      </div>
    </div>
  );
}