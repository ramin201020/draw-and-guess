import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/SocketProvider';

export function DrawingCanvas({ 
  roomId, 
  isDrawer, 
  selectedTool = 'brush',
  selectedColor = '#000000',
  brushSize = 8,
  backgroundColor = '#FFFFFF',
  onClearCanvas
}) {
  const { socket } = useSocket();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Remove local state for color, brushSize, isErasing since they come from props
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);

  // Determine if we're erasing based on selectedTool prop
  const isErasing = selectedTool === 'eraser';

  // Set up canvas with fixed dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const setupCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Set display size
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Set actual size in memory
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale context to match DPR
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
    };

    setupCanvas();
    
    // Only resize on window resize, not continuously
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

  // Draw stroke function
  const drawStroke = useCallback((ctx, stroke) => {
    if (!ctx || !stroke) return;
    
    const dpr = window.devicePixelRatio || 1;
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.width;
    
    if (stroke.tool === 'ERASER') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(255,255,255,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }
    
    ctx.beginPath();
    ctx.moveTo(stroke.from.x / dpr, stroke.from.y / dpr);
    ctx.lineTo(stroke.to.x / dpr, stroke.to.y / dpr);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    const handleIncomingStroke = (payload) => {
      const stroke = payload?.stroke ?? payload;
      const canvas = canvasRef.current;
      if (!canvas || !stroke) return;
      const ctx = canvas.getContext('2d');
      drawStroke(ctx, stroke, canvas.width);
    };
    
    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    };
    
    socket.on('draw:stroke', handleIncomingStroke);
    socket.on('draw:clear', handleClear);
    
    return () => {
      socket.off('draw:stroke', handleIncomingStroke);
      socket.off('draw:clear', handleClear);
    };
  }, [socket, drawStroke]);

  // Emit stroke to server
  const emitStroke = useCallback((stroke) => {
    if (!socket) return;
    socket.emit('draw:stroke', { roomId, stroke });
  }, [socket, roomId]);

  // Get canvas coordinates from event
  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Handle both mouse and touch events
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr
    };
  };

  // Drawing handlers
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
    setLastPoint(point);
    
    // Draw a dot for single clicks
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.fillStyle = isErasing ? '#FFFFFF' : selectedColor;
    ctx.beginPath();
    ctx.arc(point.x / dpr, point.y / dpr, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (event) => {
    if (!drawing || !lastPoint || !isDrawer) return;
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const nextPoint = getCanvasPoint(event);
    if (!nextPoint) return;
    
    const stroke = {
      from: lastPoint,
      to: nextPoint,
      color: selectedColor,
      width: brushSize,
      tool: isErasing ? 'ERASER' : 'BRUSH'
    };
    
    drawStroke(ctx, stroke, canvas.width);
    emitStroke(stroke);
    setLastPoint(nextPoint);
  };

  const handlePointerUp = (event) => {
    if (!drawing) return;
    
    const canvas = canvasRef.current;
    if (canvas && event?.pointerId !== undefined) {
      canvas.releasePointerCapture(event.pointerId);
    }
    
    setDrawing(false);
    setLastPoint(null);
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    socket?.emit('draw:clear', { roomId });
  };

  // Expose clearCanvas to parent component
  React.useEffect(() => {
    if (onClearCanvas) {
      // This is a bit of a hack, but we need to expose the clearCanvas function
      // In a real app, we might use useImperativeHandle or a different pattern
      window.clearCanvasFunction = clearCanvas;
    }
  }, [onClearCanvas, backgroundColor, roomId, socket]);

  return (
    <div className="canvas-wrapper">
      {/* Canvas */}
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

      {/* Spectator hint */}
      {!isDrawer && (
        <div className="spectator-hint">
          Type your guess in the chat →
        </div>
      )}
    </div>
  );
}
