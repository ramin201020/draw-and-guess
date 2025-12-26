import React, { useState, useEffect } from 'react';

export function Timer({ endsAt, onTimeUp, isActive = true }) {
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
    let baseClass = 'timer';
    if (isCritical) return `${baseClass} critical`;
    if (isWarning) return `${baseClass} warning`;
    return baseClass;
  };

  const getProgressPercentage = () => {
    if (!endsAt) return 0;
    // Calculate total time from the round settings (default 90 seconds)
    const now = Date.now();
    const totalDuration = 90 * 1000; // 90 seconds in milliseconds
    const timeRemaining = Math.max(0, endsAt - now);
    const timeElapsed = totalDuration - timeRemaining;
    return Math.min(100, Math.max(0, (timeElapsed / totalDuration) * 100));
  };

  if (!isActive || timeLeft <= 0) {
    return null;
  }

  return (
    <div className={getTimerClass()}>
      <div className="timer-container">
        <div className="timer-progress">
          <div 
            className="timer-progress-bar" 
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        <div className="timer-display">
          <span className="timer-icon">⏰</span>
          <span className="timer-text">{formatTime(timeLeft)}</span>
        </div>
        {isCritical && (
          <div className="timer-pulse">
            <span className="pulse-dot"></span>
          </div>
        )}
      </div>
    </div>
  );
}