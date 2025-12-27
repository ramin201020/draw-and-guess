import React, { useState, useEffect } from 'react';

export function Timer({ endsAt, onTimeUp, isActive = true, autoProgressCountdown = null }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

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
      
      // Set warning states
      setIsWarning(seconds <= 30 && seconds > 10);
      setIsCritical(seconds <= 10);
      
      // Call onTimeUp when timer reaches 0
      if (seconds <= 0 && onTimeUp) {
        onTimeUp();
      }
    };

    // Update immediately
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [endsAt, isActive, onTimeUp]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    let baseClass = 'timer-digital';
    if (isCritical) return `${baseClass} critical`;
    if (isWarning) return `${baseClass} warning`;
    return baseClass;
  };

  // Show auto-progress countdown if available
  if (autoProgressCountdown !== null && autoProgressCountdown > 0) {
    return (
      <div className="timer-digital auto-progress">
        <div className="digital-display">
          <div className="digital-segments">
            <span className="digital-time">Next in {autoProgressCountdown}s</span>
          </div>
          <div className="digital-glow"></div>
        </div>
      </div>
    );
  }

  if (!isActive || timeLeft <= 0) {
    return null;
  }

  return (
    <div className={getTimerClass()}>
      <div className="digital-display">
        <div className="digital-segments">
          <span className="digital-time">{formatTime(timeLeft)}</span>
        </div>
        <div className="digital-glow"></div>
        {isCritical && (
          <div className="digital-pulse">
            <span className="pulse-dot"></span>
          </div>
        )}
      </div>
    </div>
  );
}