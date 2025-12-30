import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';

export function LandingPage() {
  const { socket, selfId, connectionStatus, setRoomState } = useSocket();
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [maxPoints, setMaxPoints] = useState(300);
  const [roundTimeSec, setRoundTimeSec] = useState(90);
  const [wordsPerRound, setWordsPerRound] = useState(3);
  const [maxLettersRevealed, setMaxLettersRevealed] = useState(4);
  const [maxWordLength, setMaxWordLength] = useState(10);
  const [totalRounds, setTotalRounds] = useState(3);
  const [customWords, setCustomWords] = useState('');
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
    // allow clearing the field completely
    if (value === '') {
      setter('');
      return;
    }
    // strip leading zeros but keep a single zero value
    value = value.replace(/^0+(?=\d)/, '');
    setter(Number(value));
  };

  const handleCreate = async () => {
    if (isCreating) return; // Prevent double-clicks
    
    // Check connection status first
    if (connectionStatus !== 'connected' || !socket || !selfId) {
      alert(`Cannot create room: ${getConnectionStatusText()}. Please wait for connection.`);
      return;
    }

    setIsCreating(true);

    try {
      // Use socket-based room creation for faster response
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

      console.log('Creating room via socket with payload:', payload);

      // Use socket for immediate response
      socket.emit('room:create', payload, (response) => {
        setIsCreating(false);
        
        if (response?.ok) {
          console.log('Room created successfully:', response);
          setRoomState(response.state);
          // Save player name for reconnection
          localStorage.setItem('playerName', name || 'Host');
          // Navigate immediately without waiting
          navigate(`/room/${response.roomId}`, { replace: true });
        } else {
          console.error('Failed to create room:', response);
          alert(`Could not create room: ${response?.error || 'Unknown error'}`);
        }
      });

      // Fallback timeout in case socket doesn't respond
      setTimeout(() => {
        if (isCreating) {
          setIsCreating(false);
          alert('Room creation timed out. Please try again.');
        }
      }, 5000);

    } catch (err) {
      console.error('Error creating room:', err);
      setIsCreating(false);
      alert(`Could not create room: ${err.message}`);
    }
  };

  const handleJoin = () => {
    if (isJoining) return; // Prevent double-clicks
    
    if (!roomId.trim()) {
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
      { roomId: roomId.trim(), name: name || 'Player' },
      (res) => {
        setIsJoining(false);
        
        if (res?.ok) {
          console.log('Joined room successfully:', res);
          setRoomState(res.state);
          // Save player name for reconnection
          localStorage.setItem('playerName', name || 'Player');
          navigate(`/room/${roomId.trim()}`, { replace: true });
        } else {
          console.error('Failed to join room:', res);
          alert(`Could not join room: ${res?.error || 'Room not found or full'}`);
        }
      }
    );

    // Fallback timeout
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
    <div className="page neon-bg">
      <div className="card">
        <div className="landing-header">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h1 className="title doodles-logo" style={{ margin: 0, flex: '1 1 auto' }}>Doodles</h1>
            <div style={{ 
              color: getConnectionStatusColor(),
              fontSize: '0.9rem',
              fontWeight: '600',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: `2px solid ${getConnectionStatusColor()}`,
              whiteSpace: 'nowrap'
            }}>
              {getConnectionStatusText()}
            </div>
          </div>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
        </div>

        <div className="landing-content">
          <div className="create-room-section">
            <div className="section">
              <h2>Create Room</h2>
              <div className="settings-grid">
                <label>
                  Max points (first guess)
                  <input type="number" value={maxPoints} onChange={handleNumericChange(setMaxPoints)} />
                </label>
                <label>
                  Round time (seconds)
                  <input type="number" value={roundTimeSec} onChange={handleNumericChange(setRoundTimeSec)} />
                </label>
                <label>
                  Word options for drawer
                  <input type="number" value={wordsPerRound} onChange={handleNumericChange(setWordsPerRound)} />
                </label>
                <label>
                  Max letters revealed
                  <input 
                    type="number" 
                    value={maxLettersRevealed} 
                    onChange={handleNumericChange(setMaxLettersRevealed)}
                    min="1"
                    max="8"
                  />
                </label>
                <label>
                  Max word length
                  <input 
                    type="number" 
                    value={maxWordLength} 
                    onChange={handleNumericChange(setMaxWordLength)}
                    min="3"
                    max="15"
                  />
                </label>
                <label>
                  Total rounds
                  <input 
                    type="number" 
                    value={totalRounds} 
                    onChange={handleNumericChange(setTotalRounds)}
                    min="1"
                    max="10"
                  />
                </label>
              </div>
              <label>
                Custom words (comma-separated)
                <input
                  value={customWords}
                  onChange={(e) => setCustomWords(e.target.value)}
                  placeholder="cat, dog, house, tree..."
                />
              </label>
              <button 
                onClick={handleCreate} 
                className="primary-btn landing-main-btn"
                disabled={isCreating || connectionStatus !== 'connected'}
              >
                {isCreating ? '🔄 Creating Room...' : 'Create Room'}
              </button>
            </div>
          </div>

          <div className="join-room-section">
            <div className="section">
              <h2>Join Room</h2>
              <label>
                Enter a room code to join
                <input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Paste or type a code like ab12cd"
                />
              </label>
              <button 
                onClick={handleJoin} 
                className="secondary-btn landing-main-btn"
                disabled={isJoining || connectionStatus !== 'connected' || !roomId.trim()}
              >
                {isJoining ? '🔄 Joining Room...' : 'Join by code'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
