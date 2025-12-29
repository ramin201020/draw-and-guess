import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';
import { DrawingCanvas } from '../ui/DrawingCanvas';
import { ChatBox } from '../ui/ChatBox';
import { PlayersSidebar } from '../ui/PlayersSidebar';
import { Timer } from '../ui/Timer';
import { RoundResults } from '../ui/RoundResults';
import { VoiceChat } from '../ui/VoiceChat';

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket, roomState, selfId } = useSocket();
  const [wordOptions, setWordOptions] = useState([]);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [lastRoundWord, setLastRoundWord] = useState('');
  const [autoProgressCountdown, setAutoProgressCountdown] = useState(null);

  const me = useMemo(() => roomState?.players?.find((p) => p.id === selfId) || null, [roomState, selfId]);
  const isHost = !!me?.isHost;
  const isDrawer = !!me?.isDrawer;

  useEffect(() => {
    if (!socket) return;
    
    const handleWordOptions = (opts) => {
      setPendingSelection(null);
      setWordOptions(opts || []);
    };
    
    const handleRoundStart = () => {
      setPendingSelection(null);
      setWordOptions([]);
      setShowResults(false);
    };
    
    const handleDrawerTurnEnd = ({ word, state }) => {
      setLastRoundWord(word || '');
      if (state?.gameState?.allDrawersCompleted) {
        setShowResults(true);
      }
    };
    
    const handleRoundComplete = () => {
      setShowResults(true);
    };
    
    const handleAutoProgressCountdown = ({ countdown }) => {
      setAutoProgressCountdown(countdown);
    };
    
    const handleGameComplete = ({ finalRankings }) => {
      setShowResults(true);
      console.log('Game completed with rankings:', finalRankings);
    };
    
    const handleRoomState = (state) => {
      if (state?.gameState?.autoProgressCountdown !== undefined) {
        setAutoProgressCountdown(state.gameState.autoProgressCountdown);
      }
    };
    
    socket.on('round:wordOptions', handleWordOptions);
    socket.on('round:start', handleRoundStart);
    socket.on('drawer:turnEnd', handleDrawerTurnEnd);
    socket.on('round:complete', handleRoundComplete);
    socket.on('autoProgress:countdown', handleAutoProgressCountdown);
    socket.on('game:complete', handleGameComplete);
    socket.on('room:state', handleRoomState);
    socket.on('room:closed', () => navigate('/'));
    socket.on('room:kicked', () => navigate('/'));
    
    return () => {
      socket.off('round:wordOptions', handleWordOptions);
      socket.off('round:start', handleRoundStart);
      socket.off('drawer:turnEnd', handleDrawerTurnEnd);
      socket.off('round:complete', handleRoundComplete);
      socket.off('autoProgress:countdown', handleAutoProgressCountdown);
      socket.off('game:complete', handleGameComplete);
      socket.off('room:state', handleRoomState);
      socket.off('room:closed');
      socket.off('room:kicked');
    };
  }, [socket, navigate]);

  const handleTimeUp = () => {
    if (!socket || !isHost) return;
    socket.emit('round:end', { roomId, reason: 'TIME_UP' });
  };

  const handleNextRound = () => {
    setShowResults(false);
    if (!socket) return;
    socket.emit('game:start', { roomId });
  };

  const handleBackToLobby = () => {
    setShowResults(false);
  };

  const handleStart = () => {
    if (!socket) return;
    socket.emit('game:start', { roomId });
  };

  const handleEndRound = () => {
    if (!socket) return;
    socket.emit('round:end', { roomId, reason: 'HOST' });
  };

  const handleLeaveRoom = () => {
    if (!socket) return;
    socket.emit('room:leave', { roomId });
    localStorage.removeItem('currentRoomId');
    localStorage.removeItem('playerName');
    navigate('/');
  };

  const chooseWord = (word) => {
    if (!socket) return;
    socket.emit('round:selectWord', { roomId, word });
    setPendingSelection(word);
  };

  if (!roomState) {
    return (
      <div className="skribbl-loading">
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <p>Connecting to room...</p>
        </div>
      </div>
    );
  }

  const playerCount = roomState.players?.length || 0;
  const canStart = isHost && roomState.status === 'LOBBY' && playerCount >= 2;
  const isRoundActive = roomState.status === 'IN_ROUND' && roomState.currentRound?.endsAt;
  const currentDrawer = roomState.players?.find(p => p.isDrawer);

  // Generate word hint display
  const renderWordHint = () => {
    const mask = roomState.currentRound?.mask;
    if (!mask) return null;
    return mask.split('').map((char, i) => (
      <span key={i} className={`hint-char ${char !== '_' ? 'revealed' : ''}`}>
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <div className="skribbl-page">
      {/* Top Bar */}
      <header className="skribbl-header">
        <div className="header-left">
          <span className="logo">🎨 Doodles</span>
          <span className="room-code">Room: {roomId.toUpperCase()}</span>
        </div>
        
        <div className="header-center">
          {roomState.status === 'IN_ROUND' && (
            <div className="word-hint">
              {renderWordHint()}
            </div>
          )}
          {roomState.status === 'LOBBY' && (
            <span className="status-text">Waiting for players...</span>
          )}
        </div>
        
        <div className="header-right">
          {roomState.gameState && (
            <span className="round-info">
              Round {roomState.gameState.currentRoundNumber}/{roomState.gameState.totalRounds}
            </span>
          )}
          {(isRoundActive || autoProgressCountdown) && (
            <Timer 
              endsAt={roomState.currentRound?.endsAt}
              onTimeUp={handleTimeUp}
              isActive={isRoundActive}
              autoProgressCountdown={autoProgressCountdown}
            />
          )}
          <VoiceChat roomId={roomId} selfId={selfId} players={roomState.players} />
          <button onClick={handleLeaveRoom} className="leave-btn">Leave</button>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="skribbl-main">
        {/* Left: Players */}
        <aside className="skribbl-players">
          <PlayersSidebar room={roomState} selfId={selfId} roomId={roomId} />
        </aside>

        {/* Center: Canvas */}
        <main className="skribbl-canvas-area">
          {roomState.status === 'IN_ROUND' && (
            <div className="drawing-status">
              {isDrawer ? (
                <span className="your-turn">✏️ Your turn to draw!</span>
              ) : currentDrawer ? (
                <span className="other-drawing">{currentDrawer.name} is drawing</span>
              ) : null}
            </div>
          )}
          
          <DrawingCanvas 
            roomId={roomId} 
            isDrawer={isDrawer}
          />
          
          {/* Lobby Controls */}
          {roomState.status === 'LOBBY' && (
            <div className="lobby-controls">
              <p className="lobby-info">
                {playerCount} player{playerCount !== 1 ? 's' : ''} in lobby
              </p>
              {isHost ? (
                <button 
                  onClick={handleStart} 
                  className="start-btn"
                  disabled={!canStart}
                >
                  {canStart ? 'Start Game' : 'Need 2+ players'}
                </button>
              ) : (
                <p className="waiting-text">Waiting for host to start...</p>
              )}
            </div>
          )}
        </main>

        {/* Right: Chat */}
        <aside className="skribbl-chat">
          <ChatBox roomId={roomId} />
        </aside>
      </div>

      {/* Host Controls (floating) */}
      {isHost && roomState.status === 'IN_ROUND' && (
        <div className="host-floating-controls">
          <button onClick={handleEndRound} className="end-round-btn">
            End Round
          </button>
        </div>
      )}

      {/* Round Results Modal */}
      <RoundResults
        isVisible={showResults}
        word={lastRoundWord}
        players={roomState.players}
        onNextRound={handleNextRound}
        onBackToLobby={handleBackToLobby}
        isHost={isHost}
        roundNumber={roomState.currentRound?.number || 1}
      />

      {/* Word Selection Modal */}
      {isDrawer && wordOptions.length > 0 && (
        <div className="modal-overlay">
          <div className="word-modal">
            <h2>Choose a word to draw</h2>
            <div className="word-options">
              {wordOptions.map((w) => (
                <button
                  key={w}
                  className={`word-option ${pendingSelection === w ? 'selected' : ''}`}
                  onClick={() => chooseWord(w)}
                  disabled={!!pendingSelection}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
