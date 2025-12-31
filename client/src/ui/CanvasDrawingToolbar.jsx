import { useState } from 'react';

// Extended color palette with hex colors
const COLORS = [
  // Row 1 - Basic colors
  '#000000', '#FFFFFF', '#C0C0C0', '#808080', '#404040',
  // Row 2 - Reds/Pinks
  '#FF0000', '#FF4444', '#FF6B6B', '#FF9999', '#FFCCCC',
  // Row 3 - Oranges/Yellows
  '#FF8C00', '#FFA500', '#FFD700', '#FFFF00', '#FFFF99',
  // Row 4 - Greens
  '#00FF00', '#32CD32', '#228B22', '#006400', '#90EE90',
  // Row 5 - Blues/Cyans
  '#00FFFF', '#00BFFF', '#0000FF', '#000080', '#87CEEB',
  // Row 6 - Purples/Magentas
  '#FF00FF', '#FF69B4', '#800080', '#4B0082', '#DDA0DD',
  // Row 7 - Browns/Earth tones
  '#8B4513', '#A0522D', '#D2691E', '#F4A460', '#DEB887'
];

export function CanvasDrawingToolbar({ 
  isDrawer, 
  selectedTool, 
  onToolChange, 
  selectedColor, 
  onColorChange, 
  brushSize, 
  onBrushSizeChange, 
  onClearCanvas,
  onUndo,
  canUndo = false
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showClearPopup, setShowClearPopup] = useState(false);
  const [customColor, setCustomColor] = useState('#FF8C42');

  if (!isDrawer) return null;

  const handleClearClick = () => {
    setShowClearPopup(true);
  };

  const handleConfirmClear = () => {
    onClearCanvas();
    setShowClearPopup(false);
  };

  const handleUndo = () => {
    if (window.undoCanvasFunction) {
      window.undoCanvasFunction();
    }
    if (onUndo) {
      onUndo();
    }
  };

  return (
    <>
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

          {/* Current Color Display + Picker Toggle */}
          <div className="color-section">
            <div 
              className="current-color-btn"
              style={{ backgroundColor: selectedColor }}
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Click to open color picker"
            />
            
            {/* Color Picker Dropdown */}
            {showColorPicker && (
              <div className="color-picker-popup">
                <div className="color-picker-header">
                  <span>Select Color</span>
                  <button 
                    className="close-picker-btn"
                    onClick={() => setShowColorPicker(false)}
                  >
                    ✕
                  </button>
                </div>
                
                {/* Hex Color Grid */}
                <div className="hex-color-grid">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`hex-color-btn ${selectedColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        onColorChange(color);
                        setShowColorPicker(false);
                      }}
                      title={color}
                    />
                  ))}
                </div>
                
                {/* Custom Color Input */}
                <div className="custom-color-section">
                  <label>Custom:</label>
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="custom-color-input"
                  />
                  <button
                    className="apply-custom-btn"
                    onClick={() => {
                      onColorChange(customColor);
                      setShowColorPicker(false);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Brush Size */}
          <div className="brush-size-control">
            <span style={{ fontSize: '9px' }}>Size:</span>
            <input
              type="range"
              min="2"
              max="40"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
              className="brush-size-slider"
            />
            <span style={{ fontSize: '9px' }}>{brushSize}px</span>
          </div>

          {/* Actions */}
          <div className="action-buttons">
            <button 
              className="action-btn undo-btn"
              onClick={handleUndo}
              title="Undo last stroke"
              disabled={!canUndo}
            >
              ↶ Undo
            </button>
            <button 
              className="action-btn eraser-clear-btn"
              onClick={handleClearClick}
              title="Clear Canvas"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Popup */}
      {showClearPopup && (
        <div className="clear-popup-overlay" onClick={() => setShowClearPopup(false)}>
          <div className="clear-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Clear Canvas?</h3>
            <p>This will erase everything on the canvas.</p>
            <div className="clear-popup-buttons">
              <button 
                className="cancel-clear-btn"
                onClick={() => setShowClearPopup(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-clear-btn"
                onClick={handleConfirmClear}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
