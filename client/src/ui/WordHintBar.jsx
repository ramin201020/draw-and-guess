export function WordHintBar({ mask, status, isDrawer, word, drawerName, isChoosingWord }) {
  // Show "choosing word" message for non-drawers when drawer is selecting
  if (isChoosingWord && !isDrawer) {
    return (
      <div className="word-hint-bar choosing-word">
        <div className="choosing-word-text">
          <span className="drawer-name">{drawerName || 'Player'}</span> is choosing a word...
        </div>
      </div>
    );
  }

  // Early return if not in round or mask is invalid
  if (status !== 'IN_ROUND' || !mask) {
    return null;
  }

  // For drawer, show the full word
  if (isDrawer && word) {
    return (
      <div className="word-hint-bar drawer-view">
        <div className="word-display-full">
          <span className="word-label">Your word:</span>
          <span className="word-text">{word.toUpperCase()}</span>
        </div>
        <div className="word-length-info">
          {word.replace(/\s/g, '').length} letters
        </div>
      </div>
    );
  }

  // Safely normalize mask to array - handle all edge cases
  let maskArray = [];
  if (Array.isArray(mask)) {
    maskArray = mask;
  } else if (typeof mask === 'string' && mask.length > 0) {
    maskArray = mask.split('');
  } else {
    return null;
  }

  if (maskArray.length === 0) {
    return null;
  }

  // Create a simplified display - show revealed letters and underscores as a string
  const displayText = maskArray.map(char => {
    if (char === ' ') return '  '; // Double space for word breaks
    if (char === '_') return '_';
    return char;
  }).join(' ');

  const revealedCount = maskArray.filter(c => c !== '_' && c !== ' ').length;
  const totalLetters = maskArray.filter(c => c !== ' ').length;

  return (
    <div className="word-hint-bar guesser-view">
      <div className="word-hint-simple">
        {displayText}
      </div>
      <div className="word-length-info">
        {totalLetters} letters {revealedCount > 0 && `• ${revealedCount} revealed`}
      </div>
    </div>
  );
}
