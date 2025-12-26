import React from 'react';

function normalizeMask(mask) {
  if (!Array.isArray(mask)) return null;
  return mask.map((char) => {
    if (char === '_') return '_';
    if (char === ' ') return ' ';
    return String(char).toUpperCase();
  });
}

export function WordHintBar({ mask, status }) {
  const normalizedMask = normalizeMask(mask);

  if (!normalizedMask) {
    return (
      <div className="hint-bar hint-bar--waiting">
        <span className="hint-placeholder">
          {status === 'LOBBY' ? 'Waiting to start…' : 'Drawer is choosing a word…'}
        </span>
      </div>
    );
  }

  return (
    <div className="hint-bar" aria-label="Word progress">
      {normalizedMask.map((char, idx) => {
        if (char === ' ') {
          return <div key={`gap-${idx}`} className="hint-letter spacer" />;
        }
        const revealed = char !== '_';
        return (
          <div key={`letter-${idx}`} className={revealed ? 'hint-letter revealed' : 'hint-letter'}>
            {revealed ? char : '_'}
          </div>
        );
      })}
    </div>
  );
}
