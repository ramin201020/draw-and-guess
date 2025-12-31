import { useEffect, useMemo, useState } from 'react';
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
  const [currentWord, setCurrentWord] = useState(''); // The actual word for drawer
  const [showDrawerResults, setShowDrawerResults] = useState(false);
  const [drawerResultsData, setDrawerResultsData] = useState(null);

  const me = useMemo(() => roomState?.players?.find((p) => p.id === selfId) || null, [roomState, selfId]);
  const isHost = !!me?.isHost;
  const isDrawer = !!me?.isDrawer;

  useEffect(() => {
    if (!socket) return;
    
    const handleWordOptions = (opts) => {
      setPendingSelection(null);
      setWordOptions(opts || []);
    };
    
    const handleRoundStart = ({ mask }) => {
      setPendingSelection(null);
      setWordOptions([]);
      setShowResults(false);
      setShowDrawerResults(false);
    };
    
    const handleDrawerTurnEnd = ({ word, state, drawerId }) => {
      setLastRoundWord(word || '');
      setCurrentWord('');
      
      // Show drawer results for 6 seconds
      setDrawerResultsData({
        word,
        players: state?.players || roomState?.players || [],
        drawerName: state?.players?.find(p => p.id === drawerId)?.name || 'Drawer'
      });
      setShowDrawerResults(true);
      
      // Auto-hide after 6 seconds
      setTimeout(() => {
        setShowDrawerResults(false);
        if (state?.gameState?.allDrawersCompleted) {
          setShowResults(true);
        }
      }, 6000);
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
    setCurrentWord(word); // Store the word for the drawer
  };

  if (!roomState) {
    return (
      <div className="page neon-bg">
        <div className="card loading-card">
          <div className="loading-spinner"></div>
          <p className="loading-text">Connecting to room...</p>
        </div>
      </div>
    );
  }

  const playerCount = roomState.players?.length || 0;
  const canStart = isHost && roomState.status === 'LOBBY' && playerCount >= 2;
  const isRoundActive = roomState.status === 'IN_ROUND' && roomState.currentRound?.endsAt;
  
  // Get current drawer info
  const currentDrawer = roomState.players?.find(p => p.isDrawer);
  const isChoosingWord = isRoundActive && !roomState.currentRound?.mask?.some(c => c !== '_' && c !== ' ') && wordOptions.length === 0 && !currentWord;

  return (
    <div className="page room-page room-layout-three-column">
      {/* Timer - show during active rounds or auto-progress countdown */}
      {(isRoundActive || autoProgressCountdown) && (
        <Timer 
          endsAt={roomState.currentRound?.endsAt}
          onTimeUp={handleTimeUp}
          isActive={isRoundActive}
          autoProgressCountdown={autoProgressCountdown}
          totalTime={roomState.settings?.roundTimeSec || 90}
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
          <div 
            className="room-code-container"
            onClick={() => {
              navigator.clipboard?.writeText(roomState.id);
            }}
            title="Click to copy room code"
          >
            <span className="room-code-display">{roomState.id}</span>
            <span className="copy-icon">📋</span>
          </div>
          <span className="room-status-info">
            {playerCount} {playerCount === 1 ? 'player' : 'players'}
            {roomState.gameState && ` • Round ${roomState.gameState.currentRoundNumber}/${roomState.gameState.totalRounds}`}
          </span>
        </div>
        <div className="host-controls-compact">
          <VoiceChat roomId={roomId} selfId={selfId} players={roomState.players} />
          {isHost && (
            <>
              <button onClick={handleStart} className="start-btn" disabled={!canStart}>
                {roomState.status === 'LOBBY' ? 'Start' : 'Next'}
              </button>
              {roomState.status === 'IN_ROUND' && (
                <button onClick={handleEndRound} className="end-round-btn">End</button>
              )}
            </>
          )}
          <button onClick={handleLeaveRoom} className="leave-room-btn">
            Leave
          </button>
        </div>
      </header>

      {/* Word Hint Bar */}
      {(roomState.status === 'IN_ROUND' || (isDrawer && wordOptions.length > 0)) && (
        <WordHintBar 
          mask={roomState.currentRound?.mask} 
          status={roomState.status}
          isDrawer={isDrawer}
          word={currentWord}
          drawerName={currentDrawer?.name}
          isChoosingWord={isDrawer && wordOptions.length > 0}
        />
      )}
      
      {/* Show "choosing word" for non-drawers */}
      {roomState.status === 'IN_ROUND' && !isDrawer && !roomState.currentRound?.mask && (
        <WordHintBar 
          mask={null} 
          status={roomState.status}
          isDrawer={false}
          drawerName={currentDrawer?.name}
          isChoosingWord={true}
        />
      )}

      {/* Drawer Turn Results - shows for 6 seconds after each drawer */}
      {showDrawerResults && drawerResultsData && (
        <div className="drawer-results-overlay">
          <div className="drawer-results-modal">
            <h3>Turn Complete!</h3>
            <div className="drawer-results-word">
              The word was: <strong>{drawerResultsData.word?.toUpperCase()}</strong>
            </div>
            <div className="drawer-results-scores">
              {[...drawerResultsData.players]
                .sort((a, b) => b.score - a.score)
                .slice(0, 8)
                .map((player, index) => (
                  <div key={player.id} className="drawer-result-player">
                    <span className="result-rank">#{index + 1}</span>
                    <span className="result-avatar">{player.avatar || '👤'}</span>
                    <span className="result-name">{player.name}</span>
                    <span className="result-score">{player.score} pts</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
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
            <div className={`mobile-tabs-indicator ${mobileTab}`}></div>
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