import { useState, useEffect, useRef } from 'react';

export function Timer({ endsAt, onTimeUp, isActive = true, autoProgressCountdown = null, totalTime = 90 }) {
  const [timeLeft, setTimeLeft] = useState(0);
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show auto-progress countdown
  if (autoProgressCountdown !== null && autoProgressCountdown > 0) {
    return (
      <div className="digital-timer countdown-mode">
        <div className="timer-countdown-text">
          Next turn in {autoProgressCountdown}s
        </div>
      </div>
    );
  }

  if (!isActive || timeLeft <= 0) return null;

  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const isLow = timeLeft <= 10;
  const isWarning = timeLeft <= 30 && timeLeft > 10;

  // Determine color based on time left
  let barColor = '#4ade80'; // Green
  if (isLow) {
    barColor = '#ef4444'; // Red
  } else if (isWarning) {
    barColor = '#fbbf24'; // Yellow
  }

  return (
    <div className={`digital-timer ${isLow ? 'critical' : isWarning ? 'warning' : ''}`}>
      <div className="timer-bar-container">
        <div 
          className="timer-bar-fill"
          style={{ 
            width: `${progress * 100}%`,
            backgroundColor: barColor
          }}
        />
        <div className="timer-bar-segments">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="timer-segment" />
          ))}
        </div>
      </div>
      <div className="timer-digital-display">
        <span className="timer-digits">{formatTime(timeLeft)}</span>
      </div>
    </div>
  );
}
