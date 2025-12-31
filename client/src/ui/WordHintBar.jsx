export function WordHintBar({ mask, status }) {
  // Early return if not in round or mask is invalid
  if (status !== 'IN_ROUND' || !mask) {
    return null;
  }

  // Safely normalize mask to array - handle all edge cases
  let maskArray = [];
  if (Array.isArray(mask)) {
    maskArray = mask;
  } else if (typeof mask === 'string' && mask.length > 0) {
    maskArray = mask.split('');
  } else {
    // Invalid mask type, don't render
    return null;
  }

  // Don't render if mask array is empty
  if (maskArray.length === 0) {
    return null;
  }

  return (
    <div className="word-hint-bar">
      <div className="word-hint-display">
        {maskArray.map((char, i) => (
          <span key={i} className={`hint-char ${char !== '_' ? 'revealed' : ''}`}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
      <div className="word-length-info">
        {maskArray.filter(c => c !== ' ').length} letters
      </div>
    </div>
  );
}