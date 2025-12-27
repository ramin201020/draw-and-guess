import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/SocketProvider';

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

// Flood fill algorithm
function floodFill(imageData, startX, startY, fillColor) {
  const { data, width, height } = imageData;
  const startPos = (startY * width + startX) * 4;
  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];
  
  const fillR = parseInt(fillColor.slice(1, 3), 16);
  const fillG = parseInt(fillColor.slice(3, 5), 16);
  const fillB = parseInt(fillColor.slice(5, 7), 16);
  
  // If the start color is the same as fill color, return
  if (startR === fillR && startG === fillG && startB === fillB) return;
  
  const stack = [[startX, startY]];
  const visited = new Set();
  
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;
    
    if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue;
    visited.add(key);
    
    const pos = (y * width + x) * 4;
    const r = data[pos];
    const g = data[pos + 1];
    const b = data[pos + 2];
    const a = data[pos + 3];
    
    // If this pixel doesn't match the start color, skip it
    if (r !== startR || g !== startG || b !== startB || a !== startA) continue;
    
    // Fill this pixel
    data[pos] = fillR;
    data[pos + 1] = fillG;
    data[pos + 2] = fillB;
    data[pos + 3] = 255;
    
    // Add neighboring pixels to stack
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

export function DrawingCanvas({ 
  roomId, 
  isDrawer, 
  currentTool = 'BRUSH',
  currentColor = '#002855',
  brushSize = 6,
  canvasBackground = 'light'
}) {
  const { socket } = useSocket();
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);

  const isErasing = currentTool === 'ERASER';
  const isFilling = currentTool === 'FILL';

  const drawStroke = useCallback((ctx, stroke) => {
    if (!ctx || !stroke) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = stroke.width || brushSize;
    const tool = stroke.tool || 'BRUSH';
    if (tool === 'ERASER') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = stroke.color || '#ffffff';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || currentColor;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.from.x, stroke.from.y);
    ctx.lineTo(stroke.to.x, stroke.to.y);
    ctx.stroke();
    ctx.restore();
  }, [brushSize, currentColor]);

  useEffect(() => {
    if (!socket) return;
    const handleIncomingStroke = (payload) => {
      const stroke = payload?.stroke ?? payload;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !stroke) return;
      drawStroke(ctx, stroke);
    };
    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    const handleFill = (payload) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      floodFill(imageData, payload.x, payload.y, payload.color);
      ctx.putImageData(imageData, 0, 0);
    };
    socket.on('draw:stroke', handleIncomingStroke);
    socket.on('draw:clear', handleClear);
    socket.on('draw:fill', handleFill);
    return () => {
      socket.off('draw:stroke', handleIncomingStroke);
      socket.off('draw:clear', handleClear);
      socket.off('draw:fill', handleFill);
    };
  }, [socket, drawStroke]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      let snapshot = null;
      try {
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (err) {
        // ignore
      }
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      if (snapshot) {
        ctx.putImageData(snapshot, 0, 0);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const emitStroke = useCallback((stroke) => {
    if (!socket) return;
    socket.emit('draw:stroke', { roomId, stroke });
  }, [socket, roomId]);

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * window.devicePixelRatio,
      y: (event.clientY - rect.top) * window.devicePixelRatio
    };
  };

  const handlePointerDown = (event) => {
    if (!isDrawer) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    if (!point) return;
    
    // Handle fill tool
    if (isFilling) {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      floodFill(imageData, Math.floor(point.x), Math.floor(point.y), currentColor);
      ctx.putImageData(imageData, 0, 0);
      
      // Emit fill action to other players
      socket?.emit('draw:fill', { 
        roomId, 
        x: Math.floor(point.x), 
        y: Math.floor(point.y), 
        color: currentColor,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
      return;
    }
    
    setDrawing(true);
    setLastPoint(point);
  };

  const handlePointerMove = (event) => {
    if (!drawing || !lastPoint || !isDrawer || isFilling) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const nextPoint = getCanvasPoint(event);
    if (!nextPoint) return;
    const stroke = {
      from: lastPoint,
      to: nextPoint,
      color: currentColor,
      width: brushSize,
      tool: isErasing ? 'ERASER' : 'BRUSH'
    };
    drawStroke(ctx, stroke);
    emitStroke(stroke);
    setLastPoint(nextPoint);
  };

  const stopDrawing = (event) => {
    if (!drawing) return;
    if (event) {
      const canvas = canvasRef.current;
      canvas?.releasePointerCapture(event.pointerId);
    }
    setDrawing(false);
    setLastPoint(null);
  };

  return (
    <div className="canvas-panel">
      {/* Canvas Container - Simplified for new layout */}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          className={`draw-canvas ${canvasBackground} ${isDrawer ? '' : 'spectator'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
        />
      </div>

      {!isDrawer && <div className="hint-text">Guess by typing in the chat below.</div>}
    </div>
  );
}