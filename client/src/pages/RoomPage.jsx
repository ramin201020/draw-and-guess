import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';
import { DrawingCanvas } from '../ui/DrawingCanvas';
import { ChatBox } from '../ui/ChatBox';
import { PlayersSidebar } from '../ui/PlayersSidebar';
import { WordHintBar } from '../ui/WordHintBar';

function ConnectionStatus({ status }) {
  const statusConfig = {
    connecting: { color: '#fbbf24', text: 'Connecting...' },
    connected: { color: '#10b981', text: 'Connected' },
    disconnected: { color: '#ef4444', text: 'Disconnected' },
    reconnecting: { color: '#f59e0b', text: 'Reconnecting...' },
    error: { color: '#dc2626', text: 'Connection Error' }
  };

  const config = statusConfig[status] || statusConfig.connecting;

  return (
    <div className="connection-status" style={{ color: config.color }}>
      <div className="status-dot" style={{ backgroundColor: config.color }}></div>
      {config.text}
    </div>
  );
}

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket, roomState, selfId, connectionStatus } = useSocket();
  const [wordOptions, setWordOptions] = useState([]);
  const [pendingSelection, setPendingSelection] = useState(null);

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
    };
    socket.on('round:wordOptions', handleWordOptions);
    socket.on('round:start', handleRoundStart);
    socket.on('room:closed', () => navigate('/'));
    socket.on('room:kicked', () => navigate('/'));
    return () => {
      socket.off('round:wordOptions', handleWordOptions);
      socket.off('round:start', handleRoundStart);
    };
  }, [socket, navigate]);

  const handleStart = () => {
    if (!socket) return;
    socket.emit('game:start', { roomId });
  };

  const handleEndRound = () => {
    if (!socket) return;
    socket.emit('round:end', { roomId, reason: 'HOST' });
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
          <ConnectionStatus status={connectionStatus} />
        </div>
      </div>
    );
  }

  const playerCount = roomState.players?.length || 0;
  const canStart = isHost && roomState.status === 'LOBBY' && playerCount >= 2;

  return (
    <div className="page neon-bg room-layout">
      <PlayersSidebar room={roomState} selfId={selfId} roomId={roomId} />
      <main className="main-panel">
        <header className="room-header">
          <div>
            <div className="room-header-top">
              <p className="eyebrow">Doodles Lobby · Room {roomState.id}</p>
              <ConnectionStatus status={connectionStatus} />
            </div>
            <h1 className="room-title">{roomState.status === 'LOBBY' ? 'Waiting for players' : 'Game in progress'}</h1>
            <p>
              Status: <strong>{roomState.status}</strong>
            </p>
            {roomState.status === 'LOBBY' && (
              <p className="lobby-hint">Invite friends, then hit start once at least two doodlers are here.</p>
            )}
          </div>
          {isHost && (
            <div className="host-controls">
              <button onClick={handleStart} className="primary-btn" disabled={!canStart || connectionStatus !== 'connected'}>
                {roomState.status === 'LOBBY' ? 'Start Game' : 'Next Round'}
              </button>
              {roomState.status === 'IN_ROUND' && (
                <button onClick={handleEndRound} className="danger-btn">End Round</button>
              )}
            </div>
          )}
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
