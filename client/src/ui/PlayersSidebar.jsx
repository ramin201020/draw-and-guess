import { useState, useEffect } from 'react';
import { useSocket } from '../socket/SocketProvider';

export function PlayersSidebar({ room, selfId, roomId }) {
  const { socket } = useSocket();
  const [voiceParticipants, setVoiceParticipants] = useState(new Set());
  
  const me = room.players.find((p) => p.id === selfId);
  const isHost = !!me?.isHost;

  // Sort players by score (highest first)
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  useEffect(() => {
    if (!socket) return;

    const handleVoiceParticipants = (participants) => {
      setVoiceParticipants(new Set(participants));
    };

    socket.on('voice:participants', handleVoiceParticipants);
    return () => socket.off('voice:participants', handleVoiceParticipants);
  }, [socket]);

  const kick = (id) => {
    if (!socket) return;
    socket.emit('room:kick', { roomId, targetId: id });
  };

  return (
    <div className="players-list">
      {sortedPlayers.map((player, index) => {
        const isSelf = player.id === selfId;
        const inVoice = voiceParticipants.has(player.id);
        
        return (
          <div 
            key={player.id} 
            className={`player-item ${isSelf ? 'is-self' : ''} ${player.isDrawer ? 'is-drawer' : ''}`}
          >
            <span className="player-rank">#{index + 1}</span>
            
            <div className="player-info">
              <span className="player-name">
                {player.name}
                {player.isHost && <span className="host-badge">👑</span>}
                {player.isDrawer && <span className="drawer-badge">✏️</span>}
                {inVoice && <span className="voice-badge">🎤</span>}
              </span>
              <span className="player-score">{player.score} pts</span>
            </div>

            {isHost && !isSelf && (
              <button 
                className="kick-btn" 
                onClick={() => kick(player.id)}
                title="Kick player"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
