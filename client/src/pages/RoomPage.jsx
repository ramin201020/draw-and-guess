import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';
import { DrawingCanvas } from '../ui/DrawingCanvas';
import { ChatBox } from '../ui/ChatBox';
import { PlayersSidebar } from '../ui/PlayersSidebar';
import { WordHintBar } from '../ui/WordHintBar';
import { Timer } from '../ui/Timer';
import { RoundResults } from '../ui/RoundResults';

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket, roomState, selfId } = useSocket();
  const [wordOptions, setWordOptions] = useState([]);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [lastRoundWord, setLastRoundWord] = useState('');

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
    
    const handleRoundEnd = ({ word, state }) => {
      setLastRoundWord(word || '');
      setShowResults(true);
      // Auto-hide results after 10 seconds if not host
      if (!isHost) {
        setTimeout(() => setShowResults(false), 10000);
      }
    };
    
    socket.on('round:wordOptions', handleWordOptions);
    socket.on('round:start', handleRoundStart);
    socket.on('round:end', handleRoundEnd);
    socket.on('room:closed', () => navigate('/'));
    socket.on('room:kicked', () => navigate('/'));
    
    return () => {
      socket.off('round:wordOptions', handleWordOptions);
      socket.off('round:start', handleRoundStart);
      socket.off('round:end', handleRoundEnd);
      socket.off('room:closed');
      socket.off('room:kicked');
    };
  }, [socket, navigate, isHost]);

  const handleTimeUp = () => {
    if (!socket || !isHost) return;
    console.log('⏰ Time is up! Ending round...');
    socket.emit('round:end', { roomId, reason: 'TIME_UP' });
  };

  const handleNextRound = () => {
    setShowResults(false);
    if (!socket) return;
    socket.emit('game:start', { roomId });
  };

  const handleBackToLobby = () => {
    setShowResults(false);
    // This would need server-side implementation to reset game state
    // For now, just hide results
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
    <div className="page neon-bg room-layout">
      {/* Timer - only show during active rounds */}
      {isRoundActive && (
        <Timer 
          endsAt={roomState.currentRound.endsAt}
          onTimeUp={handleTimeUp}
          isActive={true}
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

      <PlayersSidebar room={roomState} selfId={selfId} roomId={roomId} />
      <main className="main-panel">
        <header className="room-header">
          <div>
            <p className="eyebrow">Doodles Lobby · Room {roomState.id}</p>
            <h1 className="room-title">{roomState.status === 'LOBBY' ? 'Waiting for players' : 'Game in progress'}</h1>
            <p>
              Status: <strong>{roomState.status}</strong>
            </p>
            {roomState.status === 'LOBBY' && (
              <p className="lobby-hint">Invite friends, then hit start once at least two doodlers are here.</p>
            )}
          </div>
          <div className="host-controls">
            {isHost && (
              <>
                <button onClick={handleStart} className="primary-btn" disabled={!canStart}>
                  {roomState.status === 'LOBBY' ? 'Start Game' : 'Next Round'}
                </button>
                {roomState.status === 'IN_ROUND' && (
                  <button onClick={handleEndRound} className="danger-btn">End Round</button>
                )}
              </>
            )}
            <button onClick={handleLeaveRoom} className="leave-btn">
              Leave Room
            </button>
          </div>
        </header>
        <WordHintBar mask={roomState.currentRound?.mask} status={roomState.status} />
        <section className="canvas-chat">
          <DrawingCanvas roomId={roomId} isDrawer={isDrawer} />
          <ChatBox roomId={roomId} />
        </section>
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