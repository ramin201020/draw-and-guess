import React, { useState } from 'react';

const COLORS = [
  '#FF8C42', '#FFE5D4', '#E67E22', '#FFF8F3', // Theme colors first
  '#FFFFFF', '#C1C1C1', '#EF130B', '#FF7100', '#FFE400', '#00CC00',
  '#00B2FF', '#231FD3', '#A300BA', '#D37CAA', '#A0522D', '#000000',
  '#4C4C4C', '#740B07', '#C23800', '#E8A200', '#005510', '#00569E',
  '#0E0865', '#550069', '#A75574', '#63300D'
];

const BRUSH_SIZES = [4, 8, 14, 22, 32];

export function IntegratedDrawingToolbar({
  isMinimized,
  onToggleMinimize,
  selectedTool,
  onToolChange,
  selectedColor,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  onClearCanvas,
  onUndo,
  onRedo
}) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const handlePaintbrushToggle = () => {
    onToggleMinimize();
  };

  const handleToolSelect = (tool) => {
    onToolChange(tool);
  };

  const handleColorSelect = (color) => {
    onColorChange(color);
    setIsColorPickerOpen(false);
  };

  const handleBrushSizeSelect = (size) => {
    onBrushSizeChange(size);
  };

  // Theme colors (orange and peach) at the beginning
  const themeColors = ['#FF8C42', '#FFE5D4', '#E67E22', '#FFF8F3'];
  const regularColors = COLORS.filter(color => !themeColors.includes(color));

  return (
    <div className={`integrated-toolbar ${isMinimized ? 'toolbar-minimized' : 'toolbar-expanded'}`}>
      {/* Paintbrush Toggle Button */}
      <button 
        className="paintbrush-toggle"
        onClick={handlePaintbrushToggle}
        title={isMinimized ? "Expand Toolbar" : "Minimize Toolbar"}
      >
        🎨
      </button>

      {/* Toolbar Content - Uses CSS transitions to show/hide */}
      <div className="toolbar-content">
        {/* Tool Selection Group */}
        <div className="tool-selection-group">
          <span className="section-label">Tools</span>
          <button
            className={`integrated-tool-btn ${selectedTool === 'brush' ? 'active' : ''}`}
            onClick={() => handleToolSelect('brush')}
            title="Brush"
          >
            ✏️
          </button>
          <button
            className={`integrated-tool-btn ${selectedTool === 'eraser' ? 'active' : ''}`}
            onClick={() => handleToolSelect('eraser')}
            title="Eraser"
          >
            🧽
          </button>
        </div>

        {/* Color Palette Group */}
        <div className="color-palette-group">
          <span className="section-label">Color</span>
          <div 
            className="current-color-display"
            style={{ backgroundColor: selectedColor }}
            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
            title="Select Color"
          />
          
          {isColorPickerOpen && (
            <div className="color-picker-dropdown">
              {/* Theme Colors Section */}
              <div className="theme-colors">
                {themeColors.map((color) => (
                  <button
                    key={color}
                    className={`theme-color-btn ${selectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    title={`Theme Color: ${color}`}
                  />
                ))}
              </div>
              
              {/* Regular Colors Grid */}
              <div className="integrated-color-grid">
                {regularColors.map((color) => (
                  <button
                    key={color}
                    className={`integrated-color-btn ${selectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Brush Size Group */}
        <div className="brush-size-group">
          <span className="section-label">Size</span>
          <input
            type="range"
            min="4"
            max="32"
            step="2"
            value={brushSize}
            onChange={(e) => handleBrushSizeSelect(parseInt(e.target.value))}
            className="brush-size-slider"
            title={`Brush Size: ${brushSize}px`}
          />
          <span className="brush-size-display">{brushSize}px</span>
        </div>

        {/* Canvas Actions Group */}
        <div className="canvas-actions-group">
          <button
            className="action-btn clear-btn"
            onClick={onClearCanvas}
            title="Clear Canvas"
          >
            🗑️ Clear
          </button>
          
          {onUndo && (
            <button
              className="action-btn undo-btn"
              onClick={onUndo}
              title="Undo"
            >
              ↶ Undo
            </button>
          )}
          
          {onRedo && (
            <button
              className="action-btn redo-btn"
              onClick={onRedo}
              title="Redo"
            >
              ↷ Redo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}