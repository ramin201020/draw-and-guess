import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';
import { DrawingCanvasContainer } from '../ui/DrawingCanvasContainer';
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
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' or 'players'

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
    <div className="page room-page room-layout-three-column">
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
          <button className="settings-icon">(settings icon)</button>
          <span 
            className="room-code-display"
            onClick={() => navigator.clipboard?.writeText(roomState.id)}
            title="Click to copy room code"
            style={{ cursor: 'pointer' }}
          >
            {roomState.id}
          </span>
          <span className="room-status-info">
            {playerCount} {playerCount === 1 ? 'player' : 'players'}
            {roomState.gameState && ` • Round ${roomState.gameState.currentRoundNumber}/${roomState.gameState.totalRounds}`}
          </span>
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
          <button onClick={handleLeaveRoom} className="leave-room-btn">
            Leave room
          </button>
        </div>
      </header>

      {/* Word Hint Bar */}
      {roomState.status === 'IN_ROUND' && roomState.currentRound?.mask && (
        <WordHintBar mask={roomState.currentRound.mask} status={roomState.status} />
      )}

      {/* Main Content Area - Three Column Layout */}
      <main className="main-content-three-column">
        {/* Left: Canvas Section */}
        <section className="canvas-section-left">
          <DrawingCanvasContainer 
            roomId={roomId} 
            isDrawer={isDrawer}
          />
        </section>

        {/* Center: Players Sidebar */}
        <section className="players-section-center">
          <PlayersSidebar room={roomState} selfId={selfId} roomId={roomId} />
        </section>

        {/* Right: Chat Section */}
        <section className="chat-section-right">
          <ChatBox roomId={roomId} />
        </section>

        {/* Mobile Bottom Panel - Tabbed interface for chat/players */}
        <div className="mobile-bottom-panel">
          <div className="mobile-tabs">
            <button 
              className={`mobile-tab ${mobileTab === 'chat' ? 'active' : ''}`}
              onClick={() => setMobileTab('chat')}
            >
              💬 Chat
            </button>
            <button 
              className={`mobile-tab ${mobileTab === 'players' ? 'active' : ''}`}
              onClick={() => setMobileTab('players')}
            >
              👥 Players ({playerCount})
            </button>
          </div>
          <div className="mobile-tab-content">
            {mobileTab === 'chat' ? (
              <ChatBox roomId={roomId} />
            ) : (
              <PlayersSidebar room={roomState} selfId={selfId} roomId={roomId} />
            )}
          </div>
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