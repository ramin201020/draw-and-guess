import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';

export function LandingPage() {
  const { socket, selfId, connectionStatus, setRoomState } = useSocket();
  const [name, setName] = useState('');
  const [maxPoints, setMaxPoints] = useState(300);
  const [roundTimeSec, setRoundTimeSec] = useState(90);
  const [totalRounds, setTotalRounds] = useState(3);
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = () => {
    setError('');
    if (isCreating || connectionStatus !== 'connected' || !socket) {
      setError('Not connected. Please wait...');
      return;
    }

    setIsCreating(true);
    
    socket.emit('room:create', {
      name: name.trim() || 'Host',
      settings: { maxPoints, roundTimeSec, totalRounds, wordsPerRound: 3, maxLettersRevealed: 4, maxWordLength: 10 }
    }, (res) => {
      setIsCreating(false);
      if (res?.ok) {
        setRoomState(res.state);
        localStorage.setItem('playerName', name.trim() || 'Host');
        navigate(`/room/${res.roomId}`, { replace: true });
      } else {
        setError(res?.error || 'Failed to create room');
      }
    });

    setTimeout(() => { if (isCreating) { setIsCreating(false); setError('Timeout - try again'); } }, 15000);
  };

  const handleJoin = () => {
    setError('');
    const code = roomCode.trim().toUpperCase();
    if (!code) { setError('Enter a room code'); return; }
    if (isJoining || connectionStatus !== 'connected' || !socket) { setError('Not connected'); return; }

    setIsJoining(true);
    
    socket.emit('room:join', { roomId: code, name: name.trim() || 'Player' }, (res) => {
      setIsJoining(false);
      if (res?.ok) {
        setRoomState(res.state);
        localStorage.setItem('playerName', name.trim() || 'Player');
        navigate(`/room/${code}`, { replace: true });
      } else {
        setError(res?.error || 'Room not found');
      }
    });

    setTimeout(() => { if (isJoining) { setIsJoining(false); setError('Timeout'); } }, 15000);
  };

  const statusColor = connectionStatus === 'connected' ? '#4ade80' : connectionStatus === 'connecting' ? '#fbbf24' : '#ef4444';

  return (
    <div className="landing-page">
      <div className="landing-card">
        <div className="connection-status" style={{ color: statusColor, borderColor: statusColor }}>
          {connectionStatus === 'connected' ? '🟢 Connected' : connectionStatus === 'connecting' ? '🟡 Connecting...' : '🔴 ' + connectionStatus}
        </div>

        <h1 className="landing-title">Doodles</h1>

        {error && <div className="error-message">⚠️ {error} <button onClick={() => setError('')}>×</button></div>}

        <div className="landing-field">
          <label className="landing-label">Name</label>
          <input className="landing-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name..." />
        </div>

        <div className="landing-divider"></div>

        <h2 className="section-title">Create Room</h2>
        <div className="settings-row">
          <div className="setting-field">
            <label className="setting-label">Max Points</label>
            <input className="setting-input" type="number" value={maxPoints} onChange={(e) => setMaxPoints(Number(e.target.value) || 300)} />
          </div>
          <div className="setting-field">
            <label className="setting-label">Round Time (sec)</label>
            <input className="setting-input" type="number" value={roundTimeSec} onChange={(e) => setRoundTimeSec(Number(e.target.value) || 90)} />
          </div>
          <div className="setting-field">
            <label className="setting-label">Total Rounds</label>
            <input className="setting-input" type="number" value={totalRounds} onChange={(e) => setTotalRounds(Number(e.target.value) || 3)} />
          </div>
        </div>

        <button className="create-room-btn" onClick={handleCreate} disabled={isCreating || connectionStatus !== 'connected'}>
          {isCreating ? 'Creating...' : 'Create Room'}
        </button>

        <div className="landing-divider"></div>

        <h2 className="section-title">Join Room</h2>
        <div className="join-row">
          <input className="join-input" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="Room code..." />
          <button className="join-btn" onClick={handleJoin} disabled={isJoining || connectionStatus !== 'connected' || !roomCode.trim()}>
            {isJoining ? '...' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}
