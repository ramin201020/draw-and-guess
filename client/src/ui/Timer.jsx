import React, { useState, useEffect } from 'react';

export function Timer({ endsAt, onTimeUp, isActive = true, autoProgressCountdown = null }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!endsAt || !isActive) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endsAt - now);
      const seconds = Math.ceil(remaining / 1000);
      
      setTimeLeft(seconds);
      
      if (seconds <= 0 && onTimeUp) {
        onTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endsAt, isActive, onTimeUp]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show auto-progress countdown
  if (autoProgressCountdown !== null && autoProgressCountdown > 0) {
    return (
      <div className="game-timer countdown">
        ⏱️ {autoProgressCountdown}s
      </div>
    );
  }

  if (!isActive || timeLeft <= 0) return null;

  const isLow = timeLeft <= 10;
  const isWarning = timeLeft <= 30 && timeLeft > 10;

  return (
    <div className={`game-timer ${isLow ? 'critical' : isWarning ? 'warning' : ''}`}>
      ⏱️ {formatTime(timeLeft)}
    </div>
  );
}
