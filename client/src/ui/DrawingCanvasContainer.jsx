import React, { useState } from 'react';
import { DrawingCanvas } from './DrawingCanvas';
import { IntegratedDrawingToolbar } from './IntegratedDrawingToolbar';

export function DrawingCanvasContainer({ roomId, isDrawer }) {
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(false);
  const [selectedTool, setSelectedTool] = useState('brush');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(8);
  const [backgroundColor, setBackgroundColor] = useState('light');

  const handleToggleMinimize = () => {
    setIsToolbarMinimized(!isToolbarMinimized);
  };

  const handleClearCanvas = () => {
    // This will be handled by the canvas component
    // We'll pass this down to the canvas
  };

  return (
    <div className="drawing-canvas-container">
      <div className={`drawing-canvas-wrapper ${isToolbarMinimized ? 'toolbar-minimized' : 'toolbar-expanded'}`}>
        <DrawingCanvas 
          roomId={roomId} 
          isDrawer={isDrawer}
          selectedTool={selectedTool}
          selectedColor={selectedColor}
          brushSize={brushSize}
          backgroundColor={backgroundColor}
          onClearCanvas={handleClearCanvas}
        />
      </div>
      
      {isDrawer && (
        <IntegratedDrawingToolbar
          isMinimized={isToolbarMinimized}
          onToggleMinimize={handleToggleMinimize}
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          backgroundColor={backgroundColor}
          onBackgroundChange={setBackgroundColor}
          onClearCanvas={handleClearCanvas}
        />
      )}
    </div>
  );
}