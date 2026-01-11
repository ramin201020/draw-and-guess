import { useState } from 'react';
import { BrushIcon, EraserIcon, TrashIcon, UndoIcon } from './Icons';

// Standard colors always visible
const COLORS = [
  '#000000', '#FFFFFF', '#808080', // Black, White, Gray
  '#FF0000', '#FF6B6B', '#FFA500', // Reds, Orange
  '#FFFF00', '#00FF00', '#32CD32', // Yellow, Greens
  '#00FFFF', '#0000FF', '#800080', // Cyan, Blue, Purple
  '#FF69B4', '#8B4513', '#DEB887'  // Pink, Browns
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
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [customColor, setCustomColor] = useState('#FF8C42');
  const [showClearPopup, setShowClearPopup] = useState(false);

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
              <BrushIcon size={20} />
            </button>
            <button 
              className={`tool-btn ${selectedTool === 'eraser' ? 'active' : ''}`}
              onClick={() => onToolChange('eraser')}
              title="Eraser"
            >
              <EraserIcon size={20} />
            </button>
          </div>

          {/* Color Palette - Always visible */}
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
            {/* Custom color button */}
            <button
              className={`color-btn custom-color-btn ${showCustomColor ? 'active' : ''}`}
              onClick={() => setShowCustomColor(!showCustomColor)}
              title="Custom Color"
            >
              +
            </button>
          </div>

          {/* Custom Color Picker */}
          {showCustomColor && (
            <div className="custom-color-picker">
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  onColorChange(e.target.value);
                }}
                className="color-input"
              />
            </div>
          )}

          {/* Brush Size */}
          <div className="brush-size-control">
            <span className="size-label">Size:</span>
            <input
              type="range"
              min="2"
              max="40"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
              className="brush-size-slider"
            />
            <span className="size-value">{brushSize}</span>
          </div>

          {/* Actions */}
          <div className="action-buttons">
            <button 
              className="action-btn undo-btn"
              onClick={handleUndo}
              title="Undo"
              disabled={!canUndo}
            >
              <UndoIcon size={18} />
            </button>
            <button 
              className="action-btn clear-btn"
              onClick={handleClearClick}
              title="Clear"
            >
              <TrashIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Popup */}
      {showClearPopup && (
        <div className="clear-popup-overlay" onClick={() => setShowClearPopup(false)}>
          <div className="clear-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Clear Canvas?</h3>
            <p>This will erase everything.</p>
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
