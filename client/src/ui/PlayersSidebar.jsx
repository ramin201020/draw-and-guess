import React, { useState, useEffect } from 'react';
import { useSocket } from '../socket/SocketProvider';

const AVATAR_COLORS = ['#ffe5ec', '#dff0ff', '#fef9c3', '#e7f8ec', '#f3e8ff', '#ffeadd'];
const ASSET_ICONS = ['🎨', '🪄', '🧩', '🛸', '🌈', '⚡️', '🎯', '🧠'];

function hashValue(seed) {
  const source = seed || 'doodler';
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickFromList(seed, list) {
  if (!list.length) return null;
  const hash = hashValue(seed);
  return list[hash % list.length];
}

function initials(name) {
  return (name || 'Doodler')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function PlayersSidebar({ room, selfId, roomId }) {
  const { socket } = useSocket();
  const [voiceParticipants, setVoiceParticipants] = useState(new Set());
  const [mutedUsers, setMutedUsers] = useState(new Set());
  
  const me = room.players.find((p) => p.id === selfId);
  const isHost = !!me?.isHost;

  // Voice chat event handlers
  useEffect(() => {
    if (!socket) return;

    const handleVoiceParticipants = (participants) => {
      setVoiceParticipants(new Set(participants));
    };

    const handleVoiceUserMuted = ({ userId, isMuted }) => {
      setMutedUsers(prev => {
        const newSet = new Set(prev);
        if (isMuted) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    };

    socket.on('voice:participants', handleVoiceParticipants);
    socket.on('voice:user-muted', handleVoiceUserMuted);

    return () => {
      socket.off('voice:participants', handleVoiceParticipants);
      socket.off('voice:user-muted', handleVoiceUserMuted);
    };
  }, [socket]);

  const kick = (id) => {
    if (!socket) return;
    socket.emit('room:kick', { roomId, targetId: id });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId.toUpperCase());
    // Optional: Show a toast or feedback
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-room-header">
        <div className="room-code-pill" onClick={copyRoomCode} title="Click to copy room code">
          <span className="room-code-label">Room code</span>
          <span className="room-code-value">{roomId.toUpperCase()}</span>
        </div>
      </div>

      <h2 className="sidebar-title">Players</h2>
      <div className="player-list">
        {room.players.map((p) => {
          const avatarColor = pickFromList(p.id, AVATAR_COLORS);
          const assetIcon = pickFromList(p.id, ASSET_ICONS);
          const inVoice = voiceParticipants.has(p.id);
          const isMuted = mutedUsers.has(p.id);
          
          return (
            <div 
              key={p.id} 
              className={`player-card ${p.id === selfId ? 'self' : ''} ${inVoice ? 'in-voice' : ''} ${inVoice && isMuted ? 'muted' : ''}`}
            >
              <div className="player-avatar" style={{ backgroundColor: avatarColor }}>
                {p.avatar ? <img src={p.avatar} alt={`${p.name} avatar`} /> : initials(p.name)}
              </div>
              <div className="player-details">
                <div className="player-header">
                  <span className="player-name">
                    {p.name}
                    {inVoice && (
                      <span className={`voice-indicator ${isMuted ? 'muted' : 'speaking'}`}>
                        {isMuted ? '🔇' : '🎤'}
                      </span>
                    )}
                  </span>
                  {p.isHost && <span className="badge">Host</span>}
                  {p.isDrawer && <span className="badge warm">Drawing</span>}
                </div>
                <div className="player-meta">
                  <span className="score"><strong>{p.score}</strong> pts</span>
                  {p.debt > 0 && <span className="debt">-{p.debt}</span>}
                </div>
              </div>
              <div className="player-asset" role="img" aria-label="player asset">
                {assetIcon}
              </div>
              {isHost && p.id !== selfId && (
                <button className="danger-btn small" onClick={() => kick(p.id)}>
                  Kick
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
