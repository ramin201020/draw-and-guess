import React from 'react';

export function WordHintBar({ mask, status }) {
  if (status !== 'IN_ROUND' || !mask) {
    return null;
  }

  return (
    <div className="word-hint-bar">
      <div className="word-hint-display">
        {mask.split('').map((char, i) => (
          <span key={i} className={`hint-char ${char !== '_' ? 'revealed' : ''}`}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
      <div className="word-length-info">
        {mask.replace(/\s/g, '').length} letters
      </div>
    </div>
  );
}