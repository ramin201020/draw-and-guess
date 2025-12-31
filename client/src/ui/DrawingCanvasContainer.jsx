import { useState, useRef } from 'react';
import { DrawingCanvas } from './DrawingCanvas';
import { CanvasDrawingToolbar } from './CanvasDrawingToolbar';

export function DrawingCanvasContainer({ roomId, isDrawer }) {
  const [selectedTool, setSelectedTool] = useState('brush');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(8);
  const [canUndo, setCanUndo] = useState(false);
  const canvasRef = useRef(null);

  const handleToolChange = (tool) => {
    setSelectedTool(tool);
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
  };

  const handleBrushSizeChange = (size) => {
    setBrushSize(size);
  };

  const handleClearCanvas = () => {
    if (window.clearCanvasFunction) {
      window.clearCanvasFunction();
    }
  };

  const handleUndo = () => {
    if (window.undoCanvasFunction) {
      window.undoCanvasFunction();
    }
  };

  const handleUndoAvailable = (available) => {
    setCanUndo(available);
  };

  return (
    <div className="drawing-canvas-container">
      <DrawingCanvas 
        ref={canvasRef}
        roomId={roomId} 
        isDrawer={isDrawer}
        selectedTool={selectedTool}
        selectedColor={selectedColor}
        brushSize={brushSize}
        onClearCanvas={handleClearCanvas}
        onUndoAvailable={handleUndoAvailable}
      />
      
      <CanvasDrawingToolbar
        isDrawer={isDrawer}
        selectedTool={selectedTool}
        onToolChange={handleToolChange}
        selectedColor={selectedColor}
        onColorChange={handleColorChange}
        brushSize={brushSize}
        onBrushSizeChange={handleBrushSizeChange}
        onClearCanvas={handleClearCanvas}
        onUndo={handleUndo}
        canUndo={canUndo}
      />
    </div>
  );
}