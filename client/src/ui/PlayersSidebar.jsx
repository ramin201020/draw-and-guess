import React, { useState, useEffect } from 'react';
import { useSocket } from '../socket/SocketProvider';
import { CrownIcon, PencilIcon, CheckIcon, MicrophoneIcon } from './Icons';

export function PlayersSidebar({ room, selfId, roomId }) {
  const { socket } = useSocket();
  const [voiceParticipants, setVoiceParticipants] = useState(new Set());
  
  const me = room.players.find((p) => p.id === selfId);
  const isHost = !!me?.isHost;

  // Sort players by score (highest first)
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  // Get list of players who guessed correctly this round
  const guessedPlayerIds = new Set(room.currentRound?.guessed || []);

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
        const hasGuessedCorrectly = guessedPlayerIds.has(player.id);
        
        return (
          <div 
            key={player.id} 
            className={`player-item ${isSelf ? 'is-self' : ''} ${player.isDrawer ? 'is-drawer' : ''} ${hasGuessedCorrectly ? 'has-guessed' : ''}`}
          >
            <span className="player-rank">#{index + 1}</span>
            
            <div className="player-info">
              <span className="player-name">{player.name}</span>
              <span className="player-score">{player.score} pts</span>
            </div>

            {/* Status badges - displayed next to player info */}
            <div className="player-badges">
              {player.isHost && <span className="badge host-badge" title="Host"><CrownIcon size={16} /></span>}
              {player.isDrawer && <span className="badge drawer-badge" title="Drawing"><PencilIcon size={16} /></span>}
              {hasGuessedCorrectly && <span className="badge guessed-badge" title="Guessed correctly"><CheckIcon size={16} /></span>}
              {inVoice && <span className="badge voice-badge" title="In voice chat"><MicrophoneIcon size={16} /></span>}
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
