import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/SocketProvider';

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

  // Draw a smooth curve through points using quadratic bezier curves
  const drawSmoothStroke = useCallback((ctx, points, color, width, tool) => {
    if (!ctx || !points || points.length < 2) return;
    
    const dpr = window.devicePixelRatio || 1;
    
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
    
    // Move to first point
    ctx.moveTo(points[0].x / dpr, points[0].y / dpr);
    
    // Use quadratic curves for smooth lines
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x / dpr + points[i + 1].x / dpr) / 2;
      const yc = (points[i].y / dpr + points[i + 1].y / dpr) / 2;
      ctx.quadraticCurveTo(points[i].x / dpr, points[i].y / dpr, xc, yc);
    }
    
    // Draw to the last point
    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x / dpr, lastPoint.y / dpr);
    }
    
    ctx.stroke();
    ctx.restore();
  }, []);

  // Draw a single line segment (for real-time updates)
  const drawLineSegment = useCallback((ctx, from, to, color, width, tool) => {
    if (!ctx || !from || !to) return;
    
    const dpr = window.devicePixelRatio || 1;
    
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
    ctx.moveTo(from.x / dpr, from.y / dpr);
    ctx.lineTo(to.x / dpr, to.y / dpr);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Redraw entire canvas from stroke history
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Redraw all strokes
    strokeHistory.forEach(stroke => {
      drawSmoothStroke(ctx, stroke.points, stroke.color, stroke.width, stroke.tool);
    });
  }, [strokeHistory, drawSmoothStroke]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    const handleIncomingStroke = (payload) => {
      const stroke = payload?.stroke ?? payload;
      const canvas = canvasRef.current;
      if (!canvas || !stroke) return;
      const ctx = canvas.getContext('2d');
      
      // Handle both old format (from/to) and new format (points array)
      if (stroke.points) {
        drawSmoothStroke(ctx, stroke.points, stroke.color, stroke.width, stroke.tool);
      } else if (stroke.from && stroke.to) {
        drawLineSegment(ctx, stroke.from, stroke.to, stroke.color, stroke.width, stroke.tool);
      }
    };
    
    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      setStrokeHistory([]);
    };

    const handleUndo = () => {
      setStrokeHistory(prev => prev.slice(0, -1));
    };
    
    socket.on('draw:stroke', handleIncomingStroke);
    socket.on('draw:clear', handleClear);
    socket.on('draw:undo', handleUndo);
    
    return () => {
      socket.off('draw:stroke', handleIncomingStroke);
      socket.off('draw:clear', handleClear);
      socket.off('draw:undo', handleUndo);
    };
  }, [socket, drawSmoothStroke, drawLineSegment]);

  // Redraw when stroke history changes (for undo)
  useEffect(() => {
    redrawCanvas();
  }, [strokeHistory, redrawCanvas]);

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

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr
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
    
    const point = getCanvasPoint(event);
    if (!point) return;
    
    setDrawing(true);
    setCurrentStroke([point]);
    
    // Draw a dot for single clicks
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    
    if (isErasing) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(255,255,255,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = selectedColor;
    }
    
    ctx.beginPath();
    ctx.arc(point.x / dpr, point.y / dpr, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
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
    const nextPoint = getCanvasPoint(event);
    if (!nextPoint) return;
    
    // Add point to current stroke
    setCurrentStroke(prev => {
      const newStroke = [...prev, nextPoint];
      
      // Draw smooth curve through all points so far
      if (newStroke.length >= 2) {
        // Clear and redraw for smooth curves
        redrawCanvas();
        drawSmoothStroke(ctx, newStroke, selectedColor, brushSize, isErasing ? 'ERASER' : 'BRUSH');
      }
      
      return newStroke;
    });
    
    // Emit individual segment for real-time sync
    if (currentStroke.length > 0) {
      const lastPoint = currentStroke[currentStroke.length - 1];
      emitStroke({
        from: lastPoint,
        to: nextPoint,
        color: selectedColor,
        width: brushSize,
        tool: isErasing ? 'ERASER' : 'BRUSH'
      });
    }
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
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    setStrokeHistory([]);
    socket?.emit('draw:clear', { roomId });
  }, [backgroundColor, roomId, socket]);

  // Undo last stroke
  const undoLastStroke = useCallback(() => {
    if (strokeHistory.length === 0) return;
    
    setStrokeHistory(prev => prev.slice(0, -1));
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
