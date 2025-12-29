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

export function DrawingCanvas({ roomId, isDrawer }) {
  const { socket } = useSocket();
  const canvasRef = useRef(null);
  const sliderRef = useRef(null);
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [isErasing, setIsErasing] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);
  const [canvasBackground, setCanvasBackground] = useState('light');
  const [colorsMinimized, setColorsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleBrushSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setBrushSize(newSize);
    
    // Add vibration effect when slider reaches the end
    if (newSize === 28 || newSize === 2) {
      if (sliderRef.current) {
        sliderRef.current.classList.add('slider-vibrate');
        setTimeout(() => {
          if (sliderRef.current) {
            sliderRef.current.classList.remove('slider-vibrate');
          }
        }, 400);
      }
    }
  };

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

      {/* Mobile minimize button for color swatches */}
      {isMobile && (
        <button 
          className="mobile-color-minimize-btn"
          onClick={() => setColorsMinimized(!colorsMinimized)}
          title={colorsMinimized ? 'Show colors' : 'Hide colors'}
        >
          🎨
        </button>
      )}

      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button
            className={!isErasing ? 'tool-button active' : 'tool-button'}
            onClick={() => toggleTool('BRUSH')}
          >
            {isMobile ? '🖌️' : 'Brush'}
          </button>
          <button
            className={isErasing ? 'tool-button active' : 'tool-button'}
            onClick={() => toggleTool('ERASER')}
          >
            {isMobile ? '🧽' : 'Eraser'}
          </button>
        </div>

        <div className="toolbar-group size-control">
          <label htmlFor="brush-size">{isMobile ? 'Size' : 'Size'}</label>
          <input
            ref={sliderRef}
            id="brush-size"
            type="range"
            min="2"
            max="28"
            value={brushSize}
            onChange={handleBrushSizeChange}
          />
          <span>{brushSize}px</span>
        </div>

        <div className="toolbar-group canvas-bg-selector">
          <label>{isMobile ? 'BG:' : 'Canvas:'}</label>
          {CANVAS_BACKGROUNDS.map((bg) => (
            <button
              key={bg.value}
              className={`canvas-bg-option ${bg.value} ${canvasBackground === bg.value ? 'active' : ''}`}
              onClick={() => setCanvasBackground(bg.value)}
              title={bg.name}
            />
          ))}
        </div>

        {isDrawer && (
          <button className="secondary-btn" onClick={clearCanvas}>
            {isMobile ? '🗑️' : 'Clear'}
          </button>
        )}
      </div>

      {/* Color swatches - collapsible on mobile */}
      {(!isMobile || !colorsMinimized) && (
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
            <span>{isMobile ? '🎨' : 'Hex'}</span>
            <input
              type="color"
              value={color}
              onChange={(e) => selectColor(e.target.value)}
            />
          </label>
        </div>
      )}

      {!isDrawer && <div className="hint-text">Guess by typing in the chat below.</div>}
    </div>
  );
}