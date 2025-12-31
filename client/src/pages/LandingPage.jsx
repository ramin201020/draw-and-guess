import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';

export function LandingPage() {
  const { socket, selfId, connectionStatus, setRoomState } = useSocket();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings
  const [maxPoints, setMaxPoints] = useState(300);
  const [roundTimeSec, setRoundTimeSec] = useState(90);
  const [wordsPerRound, setWordsPerRound] = useState(3);
  const [maxLettersRevealed, setMaxLettersRevealed] = useState(4);
  const [maxWordLength, setMaxWordLength] = useState(10);
  const [totalRounds, setTotalRounds] = useState(3);
  const [customWords, setCustomWords] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(12);
  
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    setError('');
    
    if (connectionStatus !== 'connected' || !socket || !selfId) {
      setError('Not connected to server. Please wait...');
      return;
    }

    setIsCreating(true);
    
    const payload = {
      name: name.trim() || 'Host',
      settings: {
        maxPoints: Number(maxPoints) || 300,
        roundTimeSec: Number(roundTimeSec) || 90,
        wordsPerRound: Number(wordsPerRound) || 3,
        maxLettersRevealed: Number(maxLettersRevealed) || 4,
        maxWordLength: Number(maxWordLength) || 10,
        totalRounds: Number(totalRounds) || 3,
        maxPlayers: Number(maxPlayers) || 12,
        customWords: customWords.split(',').map(w => w.trim()).filter(w => w.length > 0)
      }
    };

    socket.emit('room:create', payload, (response) => {
      setIsCreating(false);
      setShowSettings(false);
      
      if (response?.ok) {
        setRoomState(response.state);
        localStorage.setItem('playerName', payload.name);
        localStorage.setItem('currentRoomId', response.roomId);
        navigate(`/room/${response.roomId}`, { replace: true });
      } else {
        setError(`Failed to create room: ${response?.error || 'Unknown error'}`);
      }
    });

    // Timeout
    setTimeout(() => {
      if (isCreating) {
        setIsCreating(false);
        setError('Room creation timed out. Please try again.');
      }
    }, 15000);
  };

  const handleJoin = () => {
    setError('');
    const code = roomCode.trim().toUpperCase();
    if (!code) { setError('Enter a room code'); return; }
    if (connectionStatus !== 'connected' || !socket) { setError('Not connected'); return; }

    setIsJoining(true);
    
    socket.emit('room:join', { roomId: code, name: name.trim() || 'Player' }, (res) => {
      setIsJoining(false);
      if (res?.ok) {
        setRoomState(res.state);
        localStorage.setItem('playerName', name.trim() || 'Player');
        localStorage.setItem('currentRoomId', code);
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
        <p className="landing-subtitle">Draw, guess, and have fun!</p>

        {error && <div className="error-message">⚠️ {error} <button onClick={() => setError('')}>×</button></div>}

        <div className="landing-field">
          <label className="landing-label">Name</label>
          <input className="landing-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name..." />
        </div>

        <div className="landing-divider"></div>

        <button 
          className="create-room-btn" 
          onClick={() => setShowSettings(true)} 
          disabled={connectionStatus !== 'connected'}
        >
          Create an Experience
        </button>

        <div className="landing-divider"></div>

        <h2 className="section-title">Join an Experience</h2>
        <div className="join-row">
          <input className="join-input" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="Room code..." />
          <button className="join-btn" onClick={handleJoin} disabled={isJoining || connectionStatus !== 'connected' || !roomCode.trim()}>
            {isJoining ? '...' : 'Join an Experience'}
          </button>
        </div>
      </div>

      {/* Settings Popup */}
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Room Settings</h2>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>
            
            <div className="modal-content">
              <div className="settings-grid">
                <div className="setting-group">
                  <label>Max Points (first guess)</label>
                  <input type="number" value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} />
                </div>
                
                <div className="setting-group">
                  <label>Round Time (seconds)</label>
                  <input type="number" value={roundTimeSec} onChange={(e) => setRoundTimeSec(e.target.value)} />
                </div>
                
                <div className="setting-group">
                  <label>Word Options for Drawer</label>
                  <input type="number" value={wordsPerRound} onChange={(e) => setWordsPerRound(e.target.value)} />
                </div>
                
                <div className="setting-group">
                  <label>Max Letters Revealed</label>
                  <input type="number" value={maxLettersRevealed} onChange={(e) => setMaxLettersRevealed(e.target.value)} />
                </div>
                
                <div className="setting-group">
                  <label>Max Word Length</label>
                  <input type="number" value={maxWordLength} onChange={(e) => setMaxWordLength(e.target.value)} />
                </div>
                
                <div className="setting-group">
                  <label>Total Rounds</label>
                  <input type="number" value={totalRounds} onChange={(e) => setTotalRounds(e.target.value)} />
                </div>
                
                <div className="setting-group">
                  <label>Max Players</label>
                  <input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
                </div>
              </div>
              
              <div className="setting-group full-width">
                <label>Custom Words (comma-separated)</label>
                <textarea 
                  value={customWords} 
                  onChange={(e) => setCustomWords(e.target.value)}
                  placeholder="cat, dog, house, tree, car, book..."
                  rows="3"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowSettings(false)}>Cancel</button>
              <button 
                className="create-btn create-experience-btn" 
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create the Experience'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}