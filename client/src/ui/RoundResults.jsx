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

  const sortedPlayers = [...(players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="results-overlay">
      <div className="results-modal">
        <h2>Round {roundNumber} Complete!</h2>
        
        {word && (
          <div className="results-word">
            {word.toUpperCase()}
          </div>
        )}

        <div className="results-players">
          {sortedPlayers.slice(0, 5).map((player, index) => (
            <div key={player.id} className="result-player">
              <span className="result-rank">#{index + 1}</span>
              <span className="result-name">
                {player.name}
                {player.isDrawer && ' ✏️'}
              </span>
              <span className="result-score">{player.score} pts</span>
            </div>
          ))}
        </div>

        <div className="results-actions">
          {isHost ? (
            <>
              <button className="primary-btn" onClick={onNextRound}>
                Next Round
              </button>
              <button className="secondary-btn" onClick={onBackToLobby}>
                Back to Lobby
              </button>
            </>
          ) : (
            <p style={{ color: '#8b949e' }}>Waiting for host...</p>
          )}
        </div>
      </div>
    </div>
  );
}
