import React from 'react';

export function RoundResults({ 
  isVisible, 
  word, 
  players, 
  onNextRound, 
  onBackToLobby, 
  isHost,
  roundNumber 
}) {
  if (!isVisible) return null;

  // Sort players by score (highest first)
  const sortedPlayers = [...(players || [])].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const drawer = players?.find(p => p.isDrawer);

  const getPlayerInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getScoreChange = (player) => {
    // This would ideally come from the server with the actual score change
    // For now, we'll show a placeholder
    return player.isDrawer ? '+75' : '+50';
  };

  return (
    <div className="round-results-modal">
      <div className="round-results-content">
        <h2 className="round-results-title">
          🎉 Round {roundNumber} Complete!
        </h2>
        
        {word && (
          <div className="round-results-word">
            The word was: <strong>"{word.toUpperCase()}"</strong>
          </div>
        )}

        <div className="results-scoreboard">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`result-player ${
                index === 0 ? 'winner' : ''
              } ${player.isDrawer ? 'drawer' : ''}`}
            >
              <div className="result-player-info">
                <div className="result-player-avatar">
                  {getPlayerInitials(player.name)}
                </div>
                <div>
                  <div className="result-player-name">
                    {player.name}
                    {index === 0 && <span className="result-player-badge">👑 Winner</span>}
                    {player.isDrawer && <span className="result-player-badge">🎨 Artist</span>}
                  </div>
                </div>
              </div>
              
              <div className="result-player-score">
                <div className="result-score-main">
                  {player.score} pts
                </div>
                <div className="result-score-change positive">
                  +{getScoreChange(player)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="round-results-actions">
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
  );
}