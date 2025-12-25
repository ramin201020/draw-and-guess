import React from 'react';
import { useSocket } from '../socket/SocketProvider';

export function PlayersSidebar({ room, selfId, roomId }) {
  const { socket } = useSocket();
  const me = room.players.find((p) => p.id === selfId);
  const isHost = !!me?.isHost;

  const kick = (id) => {
    if (!socket) return;
    socket.emit('room:kick', { roomId, targetId: id });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-room-header">
        <div className="room-code-pill" title="Share this code so friends can join your room">
          <span className="room-code-label">Room code</span>
          <span className="room-code-value">{roomId}</span>
        </div>
      </div>

      <h2 className="sidebar-title">Players</h2>
      <ul className="player-list">
        {room.players.map((p) => (
          <li key={p.id} className={p.id === selfId ? 'player self' : 'player'}>
            <div>
              <span className="player-name">{p.name}</span>
              {p.isHost && <span className="badge">HOST</span>}
              {p.isDrawer && <span className="badge">DRAWING</span>}
            </div>
            <div className="player-meta">
              <span className="score">Score: {p.score}</span>
              {p.debt > 0 && <span className="debt">Debt: {p.debt}</span>}
              {isHost && p.id !== selfId && (
                <button className="danger-btn small" onClick={() => kick(p.id)}>
                  Kick
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
