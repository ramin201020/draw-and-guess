import React from 'react';

export function CountdownDisplay({ countdown, isRoundComplete }) {
  if (countdown === null || countdown === undefined) return null;
  
  const message = isRoundComplete 
    ? 'Next round starting in...' 
    : 'Next turn starting in...';
  
  return (
    <div className="countdown-overlay">
      <div className="countdown-content">
        <div className="countdown-number">{countdown}</div>
        <div className="countdown-message">{message}</div>
      </div>
    </div>
  );
}
