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
    const letterCount = word.replace(/\s/g, '').length;
    return (
      <div className="word-hint-bar drawer-view">
        <div className="word-display-full">
          <span className="word-text">{word.toUpperCase()}</span>
        </div>
        <span className="letter-count">{letterCount}</span>
      </div>
    );
  }

  // Safely normalize mask to array
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

  // Count letters (excluding spaces)
  const letterCount = maskArray.filter(c => c !== ' ').length;

  // Create display with spaces between each character
  // Show underscores with spaces: _ _ _ or revealed letters
  const displayChars = maskArray.map((char, i) => {
    if (char === ' ') {
      return <span key={i} className="hint-space">&nbsp;&nbsp;&nbsp;</span>;
    }
    return (
      <span key={i} className={`hint-char ${char !== '_' ? 'revealed' : ''}`}>
        {char}
      </span>
    );
  });

  return (
    <div className="word-hint-bar guesser-view">
      <div className="word-hint-display">
        {displayChars}
      </div>
      <span className="letter-count">{letterCount}</span>
    </div>
  );
}
