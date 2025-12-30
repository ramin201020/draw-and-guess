import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';

export function LandingPage() {
  const { socket, selfId, connectionStatus, setRoomState } = useSocket();
  const [name, setName] = useState('');
  const [maxPoints, setMaxPoints] = useState(300);
  const [roundTimeSec, setRoundTimeSec] = useState(90);
  const [wordsPerRound, setWordsPerRound] = useState(3);
  const [maxLettersRevealed, setMaxLettersRevealed] = useState(4);
  const [maxWordLength, setMaxWordLength] = useState(10);
  const [totalRounds, setTotalRounds] = useState(3);
  const [customWords, setCustomWords] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  const parseNumberOrDefault = (value, defaultValue) => {
    if (value === '' || value === null || value === undefined) return defaultValue;
    const n = Number(value);
    return Number.isNaN(n) ? defaultValue : n;
  };

  const handleNumericChange = (setter) => (e) => {
    let value = e.target.value;
    if (value === '') {
      setter('');
      return;
    }
    value = value.replace(/^0+(?=\d)/, '');
    setter(Number(value));
  };

  const handleCreate = async () => {
    if (isCreating) return;
    
    if (connectionStatus !== 'connected' || !socket || !selfId) {
      alert(`Cannot create room: Not connected to server. Please wait for connection.`);
      return;
    }

    setIsCreating(true);

    try {
      const payload = {
        name: name || 'Host',
        settings: {
          maxPoints: parseNumberOrDefault(maxPoints, 300),
          roundTimeSec: parseNumberOrDefault(roundTimeSec, 90),
          wordsPerRound: parseNumberOrDefault(wordsPerRound, 3),
          maxLettersRevealed: parseNumberOrDefault(maxLettersRevealed, 4),
          maxWordLength: parseNumberOrDefault(maxWordLength, 10),
          totalRounds: parseNumberOrDefault(totalRounds, 3),
          customWords: customWords.split(',').map(w => w.trim()).filter(w => w.length > 0)
        },
      };

      socket.emit('room:create', payload, (response) => {
        setIsCreating(false);
        
        if (response?.ok) {
          setRoomState(response.state);
          localStorage.setItem('playerName', name || 'Host');
          navigate(`/room/${response.roomId}`, { replace: true });
        } else {
          alert(`Could not create room: ${response?.error || 'Unknown error'}`);
        }
      });

      setTimeout(() => {
        if (isCreating) {
          setIsCreating(false);
          alert('Room creation timed out. Please try again.');
        }
      }, 5000);

    } catch (err) {
      setIsCreating(false);
      alert(`Could not create room: ${err.message}`);
    }
  };

  const handleJoin = () => {
    if (isJoining) return;
    
    if (!roomCode.trim()) {
      alert('Please enter a room code');
      return;
    }
    
    if (!socket || !socket.connected) {
      alert('Cannot join room: Not connected to server. Please wait for connection.');
      return;
    }

    setIsJoining(true);

    socket.emit(
      'room:join',
      { roomId: roomCode.trim(), name: name || 'Player' },
      (res) => {
        setIsJoining(false);
        
        if (res?.ok) {
          setRoomState(res.state);
          localStorage.setItem('playerName', name || 'Player');
          navigate(`/room/${roomCode.trim()}`, { replace: true });
        } else {
          alert(`Could not join room: ${res?.error || 'Room not found or full'}`);
        }
      }
    );

    setTimeout(() => {
      if (isJoining) {
        setIsJoining(false);
        alert('Join room timed out. Please try again.');
      }
    }, 5000);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4ade80';
      case 'connecting': return '#fbbf24';
      case 'reconnecting': return '#f59e0b';
      case 'disconnected': return '#ef4444';
      case 'error': return '#dc2626';
      case 'failed': return '#991b1b';
      default: return '#6b7280';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢 Connected';
      case 'connecting': return '🟡 Connecting...';
      case 'reconnecting': return '🟠 Reconnecting...';
      case 'disconnected': return '🔴 Disconnected';
      case 'error': return '❌ Connection Error';
      case 'failed': return '💀 Connection Failed';
      default: return '⚪ Unknown';
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-card">
        {/* Connection Status */}
        <div className="connection-status" style={{ 
          color: getConnectionStatusColor(),
          borderColor: getConnectionStatusColor()
        }}>
          {getConnectionStatusText()}
        </div>

        {/* Title */}
        <h1 className="landing-title">Doodles</h1>

        {/* Name Input */}
        <div className="landing-field">
          <label className="landing-label">Name</label>
          <input 
            className="landing-input"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="enter your name here...." 
          />
        </div>

        <div className="landing-divider"></div>

        {/* Create Room Section */}
        <div className="create-section">
          <h2 className="section-title">Create room</h2>
          
          <div className="settings-row">
            <div className="setting-field">
              <label className="setting-label">Max points</label>
              <input 
                className="setting-input"
                type="number" 
                value={maxPoints} 
                onChange={handleNumericChange(setMaxPoints)}
                placeholder="Enter the points here..."
              />
            </div>
            <div className="setting-field">
              <label className="setting-label">Round Time (seconds)</label>
              <input 
                className="setting-input"
                type="number" 
                value={roundTimeSec} 
                onChange={handleNumericChange(setRoundTimeSec)}
                placeholder="Enter the round time here.."
              />
            </div>
          </div>

          <div className="settings-row">
            <div className="setting-field">
              <label className="setting-label">Word Options</label>
              <input 
                className="setting-input"
                type="number" 
                value={wordsPerRound} 
                onChange={handleNumericChange(setWordsPerRound)}
                placeholder="Enter the word option.."
              />
            </div>
            <div className="setting-field">
              <label className="setting-label">max letters revealed</label>
              <input 
                className="setting-input"
                type="number" 
                value={maxLettersRevealed} 
                onChange={handleNumericChange(setMaxLettersRevealed)}
                placeholder="Enter the max letters.."
              />
            </div>
          </div>

          <div className="settings-row">
            <div className="setting-field">
              <label className="setting-label">Max word length</label>
              <input 
                className="setting-input"
                type="number" 
                value={maxWordLength} 
                onChange={handleNumericChange(setMaxWordLength)}
                placeholder="Enter max word length.."
              />
            </div>
            <div className="setting-field">
              <label className="setting-label">Total rounds</label>
              <input 
                className="setting-input"
                type="number" 
                value={totalRounds} 
                onChange={handleNumericChange(setTotalRounds)}
                placeholder="Enter total rounds.."
              />
            </div>
          </div>

          <div className="setting-field full-width">
            <label className="setting-label">Custom words (comma-separated)</label>
            <input 
              className="setting-input"
              value={customWords} 
              onChange={(e) => setCustomWords(e.target.value)}
              placeholder="cat, dog, house, tree..."
            />
          </div>
        </div>

        {/* Create Room Button */}
        <button 
          className="create-room-btn"
          onClick={handleCreate}
          disabled={isCreating || connectionStatus !== 'connected'}
        >
          {isCreating ? '🔄 Creating...' : 'Create Room'}
        </button>

        <div className="landing-divider"></div>

        {/* Join Room Section */}
        <div className="join-section">
          <h2 className="section-title">Join Room</h2>
          <div className="join-row">
            <input 
              className="join-input"
              value={roomCode} 
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter room code..."
            />
            <button 
              className="join-btn"
              onClick={handleJoin}
              disabled={isJoining || connectionStatus !== 'connected' || !roomCode.trim()}
            >
              {isJoining ? '🔄' : 'Join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
