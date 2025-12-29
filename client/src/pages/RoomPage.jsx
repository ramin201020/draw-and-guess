import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';
import { DrawingCanvas } from '../ui/DrawingCanvas';
import { ChatBox } from '../ui/ChatBox';
import { PlayersSidebar } from '../ui/PlayersSidebar';
import { WordHintBar } from '../ui/WordHintBar';
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
      <div className="page neon-bg">
        <div className="card">
          <p>Connecting to room...</p>
        </div>
      </div>
    );
  }

  const playerCount = roomState.players?.length || 0;
  const canStart = isHost && roomState.status === 'LOBBY' && playerCount >= 2;
  const isRoundActive = roomState.status === 'IN_ROUND' && roomState.currentRound?.endsAt;

  return (
    <div className="page room-page room-layout-no-sidebar">
      {/* Timer - show during active rounds or auto-progress countdown */}
      {(isRoundActive || autoProgressCountdown) && (
        <Timer 
          endsAt={roomState.currentRound?.endsAt}
          onTimeUp={handleTimeUp}
          isActive={isRoundActive}
          autoProgressCountdown={autoProgressCountdown}
        />
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

      {/* Compact Header for Mobile */}
      <header className="room-header-overlay">
        <div className="room-info-compact">
          <div className="room-status-line">
            <span className="room-code-compact">{roomState.id}</span>
            <span className={`status-badge ${roomState.status.toLowerCase()}`}>
              {roomState.status === 'LOBBY' ? '⏳ Lobby' : 
               roomState.status === 'IN_ROUND' ? '🎨 Drawing' : 
               roomState.status === 'ROUND_RESULTS' ? '📊 Results' : 
               roomState.status === 'GAME_COMPLETE' ? '🏆 Complete' : roomState.status}
            </span>
            <span className="player-count">
              {playerCount} {playerCount === 1 ? 'player' : 'players'}
            </span>
            {roomState.gameState && (
              <span className="round-indicator">
                Round {roomState.gameState.currentRoundNumber}/{roomState.gameState.totalRounds}
              </span>
            )}
          </div>
          {roomState.status === 'LOBBY' && (
            <p className="lobby-hint-compact">Invite friends, then hit start once at least two doodlers are here.</p>
          )}
          {roomState.status === 'IN_ROUND' && (
            <p className="lobby-hint-compact">
              🎨 {isDrawer ? 'Your turn to draw!' : 
                  roomState.players?.find(p => p.isDrawer)?.name ? 
                  `${roomState.players.find(p => p.isDrawer).name} is drawing` : 
                  'Someone is drawing'}
            </p>
          )}
          {roomState.status === 'ROUND_RESULTS' && autoProgressCountdown && (
            <p className="lobby-hint-compact">⏱️ Next {roomState.gameState?.currentRoundNumber >= roomState.gameState?.totalRounds ? 'game results' : 'round'} in {autoProgressCountdown}s...</p>
          )}
        </div>
        <div className="host-controls-compact">
          <VoiceChat roomId={roomId} selfId={selfId} players={roomState.players} />
          {isHost && (
            <>
              <button onClick={handleStart} className="primary-btn compact" disabled={!canStart}>
                {roomState.status === 'LOBBY' ? 'Start' : 'Next'}
              </button>
              {roomState.status === 'IN_ROUND' && (
                <button onClick={handleEndRound} className="danger-btn compact">End</button>
              )}
            </>
          )}
          <button onClick={handleLeaveRoom} className="leave-btn compact">
            Leave
          </button>
        </div>
      </header>

      {/* Word Hint Bar */}
      <WordHintBar mask={roomState.currentRound?.mask} status={roomState.status} />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Canvas Section - 50% on desktop, 70% on mobile */}
        <section className="canvas-section">
          <DrawingCanvas 
            roomId={roomId} 
            isDrawer={isDrawer}
          />
        </section>

        {/* Desktop Chat Section - 50% on desktop, hidden on mobile */}
        <section className="desktop-chat-section">
          <PlayersSidebar room={roomState} selfId={selfId} roomId={roomId} />
          <ChatBox roomId={roomId} />
        </section>

        {/* Mobile Bottom Panel - Hidden on desktop, 30% on mobile */}
        <div className="mobile-bottom-panel">
          <PlayersSidebar room={roomState} selfId={selfId} roomId={roomId} />
          <ChatBox roomId={roomId} />
        </div>
      </main>

      {isDrawer && wordOptions.length > 0 && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Choose a word to draw</h2>
            <div className="word-columns">
              {wordOptions.map((w) => {
                const selected = pendingSelection === w;
                return (
                  <button
                    key={w}
                    className={selected ? 'word-card selected' : 'word-card'}
                    onClick={() => chooseWord(w)}
                    disabled={!!pendingSelection}
                  >
                    <span className="word-text">{w}</span>
                    <span className="word-meta">{w.length} letters</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}