import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';
import { DrawingCanvas } from '../ui/DrawingCanvas';
import { ChatBox } from '../ui/ChatBox';
import { PlayersSidebar } from '../ui/PlayersSidebar';

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket, roomState, selfId } = useSocket();
  const [wordOptions, setWordOptions] = useState([]);

  const me = useMemo(() => roomState?.players?.find((p) => p.id === selfId) || null, [roomState, selfId]);
  const isHost = !!me?.isHost;
  const isDrawer = !!me?.isDrawer;

  useEffect(() => {
    if (!socket) return;
    const handleWordOptions = (opts) => setWordOptions(opts || []);
    socket.on('round:wordOptions', handleWordOptions);
    socket.on('room:closed', () => navigate('/'));
    socket.on('room:kicked', () => navigate('/'));
    return () => {
      socket.off('round:wordOptions', handleWordOptions);
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
    setWordOptions([]);
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

  return (
    <div className="page neon-bg room-layout">
      <PlayersSidebar room={roomState} selfId={selfId} roomId={roomId} />
      <main className="main-panel">
        <header className="room-header">
          <div>
            <h1>Room {roomState.id}</h1>
            <p>
              Status: <strong>{roomState.status}</strong>
            </p>
          </div>
          {isHost && (
            <div className="host-controls">
              <button onClick={handleStart} className="primary-btn">Start Round</button>
              <button onClick={handleEndRound} className="danger-btn">End Round</button>
            </div>
          )}
        </header>
        <section className="canvas-chat">
          <DrawingCanvas roomId={roomId} isDrawer={isDrawer} />
          <ChatBox roomId={roomId} />
        </section>
      </main>

      {isDrawer && wordOptions.length > 0 && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Choose a word to draw</h2>
            <div className="word-grid">
              {wordOptions.map((w) => (
                <button key={w} className="word-btn" onClick={() => chooseWord(w)}>
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
