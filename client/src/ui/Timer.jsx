import React, { useState, useEffect, useRef } from 'react';

export function Timer({ endsAt, onTimeUp, isActive = true, autoProgressCountdown = null, totalTime = 90 }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const canvasRef = useRef(null);
  const hasCalledTimeUp = useRef(false);

  useEffect(() => {
    if (!endsAt || !isActive) {
      setTimeLeft(0);
      hasCalledTimeUp.current = false;
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endsAt - now);
      const seconds = Math.ceil(remaining / 1000);
      
      setTimeLeft(seconds);
      
      if (seconds <= 0 && onTimeUp && !hasCalledTimeUp.current) {
        hasCalledTimeUp.current = true;
        onTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [endsAt, isActive, onTimeUp]);

  // Draw the hand-drawn style timer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = size / 2 - 8;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Calculate progress (0 to 1)
    const progress = totalTime > 0 ? timeLeft / totalTime : 0;
    
    // Determine color based on time left
    let strokeColor = '#4ade80'; // Green
    let fillColor = 'rgba(74, 222, 128, 0.1)';
    if (timeLeft <= 10) {
      strokeColor = '#ef4444'; // Red
      fillColor = 'rgba(239, 68, 68, 0.15)';
    } else if (timeLeft <= 30) {
      strokeColor = '#fbbf24'; // Yellow
      fillColor = 'rgba(251, 191, 36, 0.1)';
    }

    // Draw background circle with hand-drawn effect
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    
    // Slightly wobbly circle for hand-drawn effect
    for (let i = 0; i <= 360; i += 5) {
      const angle = (i * Math.PI) / 180;
      const wobble = Math.sin(i * 0.1) * 1.5;
      const r = radius + wobble;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Draw progress arc with hand-drawn style
    if (progress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (2 * Math.PI * progress);
      
      // Draw arc with slight wobble
      const steps = Math.floor(progress * 72);
      for (let i = 0; i <= steps; i++) {
        const t = i / 72;
        const angle = startAngle + (2 * Math.PI * t);
        const wobble = Math.sin(i * 0.3) * 1;
        const r = radius - 4 + wobble;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw tick marks with hand-drawn style
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const innerR = radius - 12;
      const outerR = radius - 4;
      const wobbleX = (Math.random() - 0.5) * 1;
      const wobbleY = (Math.random() - 0.5) * 1;
      
      ctx.beginPath();
      ctx.moveTo(
        center + innerR * Math.cos(angle) + wobbleX,
        center + innerR * Math.sin(angle) + wobbleY
      );
      ctx.lineTo(
        center + outerR * Math.cos(angle) + wobbleX,
        center + outerR * Math.sin(angle) + wobbleY
      );
      ctx.stroke();
    }
    ctx.restore();

    // Draw center dot
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = strokeColor;
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  }, [timeLeft, totalTime]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show auto-progress countdown
  if (autoProgressCountdown !== null && autoProgressCountdown > 0) {
    return (
      <div className="hand-drawn-timer countdown-mode">
        <div className="timer-countdown-text">
          Next turn in {autoProgressCountdown}s
        </div>
      </div>
    );
  }

  if (!isActive || timeLeft <= 0) return null;

  const isLow = timeLeft <= 10;
  const isWarning = timeLeft <= 30 && timeLeft > 10;

  return (
    <div className={`hand-drawn-timer ${isLow ? 'critical' : isWarning ? 'warning' : ''}`}>
      <canvas 
        ref={canvasRef} 
        width={80} 
        height={80} 
        className="timer-canvas"
      />
      <div className="timer-text">
        {formatTime(timeLeft)}
      </div>
    </div>
  );
}
