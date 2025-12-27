import React from 'react';

export function RoundResults({ 
  isVisible, 
  word, 
  players, 
  onNextRound, 
  onBackToLobby, 
  isHost,
  roundNumber,
  scoreChanges = {} // New prop to receive actual score changes from server
}) {
  if (!isVisible) return null;

  // Sort players by score (highest first)
  const sortedPlayers = [...(players || [])].sort((a, b) => b.score - a.score);

  const getPlayerInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getScoreChange = (player) => {
    // Use actual score changes if provided, otherwise show placeholder
    return scoreChanges[player.id] || (player.isDrawer ? '+75' : '+50');
  };

  return (
    <div className="round-results-overlay">
      {/* Semi-transparent canvas overlay */}
      <div className="canvas-overlay">
        <div className="overlay-content">
          <h2 className="overlay-title">
            🎉 Round {roundNumber} Complete!
          </h2>
          
          {word && (
            <div className="overlay-word">
              The word was: <strong>"{word.toUpperCase()}"</strong>
            </div>
          )}

          <div className="overlay-scoreboard">
            {sortedPlayers.map((player, index) => (
              <div 
                key={player.id} 
                className={`overlay-player ${
                  index === 0 ? 'winner' : ''
                } ${player.isDrawer ? 'drawer' : ''}`}
              >
                <div className="overlay-player-info">
                  <div className="overlay-player-avatar">
                    {getPlayerInitials(player.name)}
                  </div>
                  <div className="overlay-player-details">
                    <div className="overlay-player-name">
                      {player.name}
                      {index === 0 && <span className="overlay-badge">👑</span>}
                      {player.isDrawer && <span className="overlay-badge">🎨</span>}
                    </div>
                    <div className="overlay-player-score">
                      <strong>{player.score}</strong> pts
                    </div>
                  </div>
                </div>
                
                <div className="overlay-score-change">
                  <span className="score-increase">
                    {getScoreChange(player)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="overlay-actions">
            {isHost && (
              <>
                <button 
                  className="modern-btn modern-btn-primary" 
                  onClick={onNextRound}
                >
                  <span className="btn-icon">🎮</span>
                  <span className="btn-text">Next Round</span>
                  <div className="btn-hover-effect"></div>
                </button>
                <button 
                  className="modern-btn modern-btn-secondary" 
                  onClick={onBackToLobby}
                >
                  <span className="btn-icon">🏠</span>
                  <span className="btn-text">Back to Lobby</span>
                  <div className="btn-hover-effect"></div>
                </button>
              </>
            )}
            {!isHost && (
              <div className="waiting-message">
                <div className="waiting-spinner">⏳</div>
                <span>Waiting for host to start next round...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}