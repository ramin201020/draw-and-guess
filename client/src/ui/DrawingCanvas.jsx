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

export function DrawingCanvas({ roomId, isDrawer }) {
  const { socket } = useSocket();
  const canvasRef = useRef(null);
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [isErasing, setIsErasing] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);

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
      ctx.strokeStyle = stroke.color || color;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.from.x, stroke.from.y);
    ctx.lineTo(stroke.to.x, stroke.to.y);
    ctx.stroke();
    ctx.restore();
  }, [brushSize, color]);

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
    socket.on('draw:stroke', handleIncomingStroke);
    socket.on('draw:clear', handleClear);
    return () => {
      socket.off('draw:stroke', handleIncomingStroke);
      socket.off('draw:clear', handleClear);
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
    setDrawing(true);
    setLastPoint(point);
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
      color,
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

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket?.emit('draw:clear', { roomId });
  };

  const selectColor = (hex) => {
    setColor(hex);
    setIsErasing(false);
  };

  const toggleTool = (tool) => {
    setIsErasing(tool === 'ERASER');
  };

  return (
    <div className="canvas-panel">
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button
            className={!isErasing ? 'tool-button active' : 'tool-button'}
            onClick={() => toggleTool('BRUSH')}
          >
            Brush
          </button>
          <button
            className={isErasing ? 'tool-button active' : 'tool-button'}
            onClick={() => toggleTool('ERASER')}
          >
            Eraser
          </button>
        </div>
        <div className="toolbar-group size-control">
          <label htmlFor="brush-size">Size</label>
          <input
            id="brush-size"
            type="range"
            min="2"
            max="28"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
          <span>{brushSize}px</span>
        </div>
        {isDrawer && (
          <button className="secondary-btn" onClick={clearCanvas}>
            Clear
          </button>
        )}
      </div>

      <div className="swatch-grid">
        {COLOR_SWATCHES.map((hex) => (
          <button
            key={hex}
            className={!isErasing && color === hex ? 'swatch active' : 'swatch'}
            style={{ backgroundColor: hex }}
            onClick={() => selectColor(hex)}
          />
        ))}
        <label className="swatch custom">
          <span>Hex</span>
          <input
            type="color"
            value={color}
            onChange={(e) => selectColor(e.target.value)}
          />
        </label>
      </div>

      <canvas
        ref={canvasRef}
        className={isDrawer ? 'draw-canvas' : 'draw-canvas spectator'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={stopDrawing}
      />
      {!isDrawer && <div className="hint-text">Guess by typing in the chat below.</div>}
    </div>
  );
}
