import { useState, useEffect, useRef } from 'react';

export function Timer({ endsAt, onTimeUp, isActive = true, autoProgressCountdown = null, totalTime = 90 }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [wobbleDirection, setWobbleDirection] = useState('left');
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

  // Wobble animation - alternate every second
  useEffect(() => {
    const wobbleInterval = setInterval(() => {
      setWobbleDirection(prev => prev === 'left' ? 'right' : 'left');
    }, 1000);
    return () => clearInterval(wobbleInterval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show auto-progress countdown
  if (autoProgressCountdown !== null && autoProgressCountdown > 0) {
    return (
      <div className="wobbly-timer countdown-mode">
        <span className="countdown-text">Next in {autoProgressCountdown}s</span>
      </div>
    );
  }

  if (!isActive || timeLeft <= 0) return null;

  const isLow = timeLeft <= 10;
  const isWarning = timeLeft <= 30 && timeLeft > 10;

  return (
    <div className={`wobbly-timer ${wobbleDirection} ${isLow ? 'critical' : isWarning ? 'warning' : ''}`}>
      <span className="timer-digits">{formatTime(timeLeft)}</span>
    </div>
  );
}
