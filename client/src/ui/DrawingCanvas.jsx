import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/SocketProvider';

const COLORS = ['#39ff14', '#00ffff', '#ff00ff', '#ffffff', '#ff9900'];

export function DrawingCanvas({ roomId, isDrawer }) {
  const { socket } = useSocket();
  const canvasRef = useRef(null);
  const [color, setColor] = useState(COLORS[0]);
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);

  useEffect(() => {
    if (!socket) return;
    const handleStroke = (stroke) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      drawStroke(ctx, stroke);
    };
    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    socket.on('draw:stroke', handleStroke);
    socket.on('draw:clear', handleClear);
    return () => {
      socket.off('draw:stroke', handleStroke);
      socket.off('draw:clear', handleClear);
    };
  }, [socket]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(img, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const emitStroke = (stroke) => {
    if (!socket) return;
    socket.emit('draw:stroke', { roomId, stroke });
  };

  const handlePointerDown = (e) => {
    if (!isDrawer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * window.devicePixelRatio;
    const y = (e.clientY - rect.top) * window.devicePixelRatio;
    setDrawing(true);
    setLastPoint({ x, y });
  };

  const handlePointerMove = (e) => {
    if (!drawing || !lastPoint || !isDrawer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * window.devicePixelRatio;
    const y = (e.clientY - rect.top) * window.devicePixelRatio;
    const stroke = { from: lastPoint, to: { x, y }, color, width: 4 };
    drawStroke(ctx, stroke);
    emitStroke(stroke);
    setLastPoint({ x, y });
  };

  const handlePointerUp = () => {
    setDrawing(false);
    setLastPoint(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (socket) socket.emit('draw:clear', { roomId });
  };

  return (
    <div className="canvas-panel">
      <div className="canvas-toolbar">
        {COLORS.map((c) => (
          <button
            key={c}
            className={c === color ? 'color-swatch active' : 'color-swatch'}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
          />
        ))}
        {isDrawer && (
          <button className="secondary-btn" onClick={clearCanvas}>
            Clear
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className={isDrawer ? 'draw-canvas' : 'draw-canvas spectator'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {!isDrawer && <div className="hint-text">Waiting for drawer9s next stroke...</div>}
    </div>
  );
}

function drawStroke(ctx, stroke) {
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(stroke.from.x, stroke.from.y);
  ctx.lineTo(stroke.to.x, stroke.to.y);
  ctx.stroke();
}
