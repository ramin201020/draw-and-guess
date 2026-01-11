import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/SocketProvider';

// Fixed virtual canvas size for coordinate normalization
const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 600;

export function DrawingCanvas({ 
  roomId, 
  isDrawer, 
  selectedTool = 'brush',
  selectedColor = '#000000',
  brushSize = 8,
  backgroundColor = '#FFFFFF',
  onClearCanvas,
  onUndoAvailable
}) {
  const { socket } = useSocket();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [drawing, setDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]); // Points in current stroke
  const [strokeHistory, setStrokeHistory] = useState([]); // All completed strokes for undo
  
  const isErasing = selectedTool === 'eraser';

  // Get current canvas display dimensions
  const getCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT };
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, []);

  // Convert normalized coordinates (0-1) to canvas pixels
  const normalizedToCanvas = useCallback((nx, ny) => {
    const { width, height } = getCanvasDimensions();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: nx * width * dpr,
      y: ny * height * dpr
    };
  }, [getCanvasDimensions]);

  // Convert canvas pixels to normalized coordinates (0-1)
  const canvasToNormalized = useCallback((x, y) => {
    const { width, height } = getCanvasDimensions();
    const dpr = window.devicePixelRatio || 1;
    return {
      nx: x / (width * dpr),
      ny: y / (height * dpr)
    };
  }, [getCanvasDimensions]);

  // Set up canvas with fixed dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const setupCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
    };

    setupCanvas();
    
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setupCanvas, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Draw a line segment using normalized coordinates
  const drawLineSegmentNormalized = useCallback((ctx, from, to, color, width, tool) => {
    if (!ctx || !from || !to) return;
    
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions();
    
    // Convert normalized to display coordinates
    const fromX = from.nx * canvasWidth;
    const fromY = from.ny * canvasHeight;
    const toX = to.nx * canvasWidth;
    const toY = to.ny * canvasHeight;
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    
    if (tool === 'ERASER') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(255,255,255,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.restore();
  }, [getCanvasDimensions]);

  // Draw a dot using normalized coordinates
  const drawDotNormalized = useCallback((ctx, point, color, width, tool) => {
    if (!ctx || !point) return;
    
    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions();
    const x = point.nx * canvasWidth;
    const y = point.ny * canvasHeight;
    
    ctx.save();
    if (tool === 'ERASER') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(255,255,255,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
    }
    
    ctx.beginPath();
    ctx.arc(x, y, width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [getCanvasDimensions]);

  // Redraw entire canvas from stroke history (only used for undo)
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = getCanvasDimensions();
    
    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Redraw all strokes
    strokeHistory.forEach(stroke => {
      if (stroke.points && stroke.points.length >= 2) {
        // Draw line segments
        for (let i = 1; i < stroke.points.length; i++) {
          drawLineSegmentNormalized(ctx, stroke.points[i-1], stroke.points[i], stroke.color, stroke.width, stroke.tool);
        }
      } else if (stroke.points && stroke.points.length === 1) {
        // Single point (dot)
        drawDotNormalized(ctx, stroke.points[0], stroke.color, stroke.width, stroke.tool);
      }
    });
  }, [strokeHistory, getCanvasDimensions, drawLineSegmentNormalized, drawDotNormalized]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    const handleIncomingStroke = (payload) => {
      const stroke = payload?.stroke ?? payload;
      const canvas = canvasRef.current;
      if (!canvas || !stroke) return;
      const ctx = canvas.getContext('2d');
      
      // Handle normalized coordinates (from/to with nx/ny)
      if (stroke.from && stroke.to && stroke.from.nx !== undefined) {
        drawLineSegmentNormalized(ctx, stroke.from, stroke.to, stroke.color, stroke.width, stroke.tool);
      } else if (stroke.from && stroke.to) {
        // Legacy format - draw dot
        drawDotNormalized(ctx, { nx: stroke.from.nx || 0.5, ny: stroke.from.ny || 0.5 }, stroke.color, stroke.width, stroke.tool);
      }
    };
    
    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { width, height } = getCanvasDimensions();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      setStrokeHistory([]);
    };

    const handleUndo = () => {
      setStrokeHistory(prev => prev.slice(0, -1));
      setNeedsRedraw(true);
    };
    
    socket.on('draw:stroke', handleIncomingStroke);
    socket.on('draw:clear', handleClear);
    socket.on('draw:undo', handleUndo);
    
    return () => {
      socket.off('draw:stroke', handleIncomingStroke);
      socket.off('draw:clear', handleClear);
      socket.off('draw:undo', handleUndo);
    };
  }, [socket, drawLineSegmentNormalized, drawDotNormalized, getCanvasDimensions]);

  // Track if we need to redraw (for undo operations)
  const [needsRedraw, setNeedsRedraw] = useState(false);

  // Redraw when needed (for undo)
  useEffect(() => {
    if (needsRedraw) {
      redrawCanvas();
      setNeedsRedraw(false);
    }
  }, [needsRedraw, redrawCanvas]);

  // Notify parent about undo availability
  useEffect(() => {
    if (onUndoAvailable) {
      onUndoAvailable(strokeHistory.length > 0);
    }
  }, [strokeHistory.length, onUndoAvailable]);

  const emitStroke = useCallback((stroke) => {
    if (!socket) return;
    socket.emit('draw:stroke', { roomId, stroke });
  }, [socket, roomId]);

  const getCanvasPointNormalized = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    
    // Return normalized coordinates (0-1)
    return {
      nx: (clientX - rect.left) / rect.width,
      ny: (clientY - rect.top) / rect.height
    };
  };

  const handlePointerDown = (event) => {
    if (!isDrawer) return;
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (event.pointerId !== undefined) {
      canvas.setPointerCapture(event.pointerId);
    }
    
    const point = getCanvasPointNormalized(event);
    if (!point) return;
    
    setDrawing(true);
    setCurrentStroke([point]);
    
    // Draw a dot for single clicks
    const ctx = canvas.getContext('2d');
    drawDotNormalized(ctx, point, selectedColor, brushSize, isErasing ? 'ERASER' : 'BRUSH');
    
    // Emit the dot to other players
    emitStroke({
      from: point,
      to: point,
      color: selectedColor,
      width: brushSize,
      tool: isErasing ? 'ERASER' : 'BRUSH'
    });
  };

  const handlePointerMove = (event) => {
    if (!drawing || !isDrawer) return;
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const nextPoint = getCanvasPointNormalized(event);
    if (!nextPoint) return;
    
    // Draw line segment from last point to current point
    if (currentStroke.length > 0) {
      const lastPoint = currentStroke[currentStroke.length - 1];
      drawLineSegmentNormalized(ctx, lastPoint, nextPoint, selectedColor, brushSize, isErasing ? 'ERASER' : 'BRUSH');
      
      // Emit individual segment for real-time sync
      emitStroke({
        from: lastPoint,
        to: nextPoint,
        color: selectedColor,
        width: brushSize,
        tool: isErasing ? 'ERASER' : 'BRUSH'
      });
    }
    
    // Add point to current stroke
    setCurrentStroke(prev => [...prev, nextPoint]);
  };

  const handlePointerUp = (event) => {
    if (!drawing) return;
    
    const canvas = canvasRef.current;
    if (canvas && event?.pointerId !== undefined) {
      canvas.releasePointerCapture(event.pointerId);
    }
    
    // Save completed stroke to history
    if (currentStroke.length > 0) {
      const completedStroke = {
        points: currentStroke,
        color: selectedColor,
        width: brushSize,
        tool: isErasing ? 'ERASER' : 'BRUSH'
      };
      setStrokeHistory(prev => [...prev, completedStroke]);
    }
    
    setDrawing(false);
    setCurrentStroke([]);
  };

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = getCanvasDimensions();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    setStrokeHistory([]);
    socket?.emit('draw:clear', { roomId });
  }, [backgroundColor, roomId, socket, getCanvasDimensions]);

  // Undo last stroke
  const undoLastStroke = useCallback(() => {
    if (strokeHistory.length === 0) return;
    
    setStrokeHistory(prev => prev.slice(0, -1));
    setNeedsRedraw(true);
    socket?.emit('draw:undo', { roomId });
  }, [strokeHistory.length, roomId, socket]);

  // Expose functions to parent component
  useEffect(() => {
    window.clearCanvasFunction = clearCanvas;
    window.undoCanvasFunction = undoLastStroke;
  }, [clearCanvas, undoLastStroke]);

  return (
    <div className="canvas-wrapper">
      <div className="canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className={`game-canvas ${isDrawer ? 'can-draw' : 'spectator'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      {!isDrawer && (
        <div className="spectator-hint">
          Type your guess in the chat →
        </div>
      )}
    </div>
  );
}
