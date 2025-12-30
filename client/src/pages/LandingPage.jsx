import React, { useState, useRef, useEffect } from 'react';
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
  const [error, setError] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const navigate = useNavigate();
  const createTimeoutRef = useRef(null);
  const joinTimeoutRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (createTimeoutRef.current) clearTimeout(createTimeoutRef.current);
      if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

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

  const startLoadingProgress = () => {
    setLoadingProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);
  };

  const stopLoadingProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setLoadingProgress(100);
    setTimeout(() => setLoadingProgress(0), 300);
  };

  const handleCreate = () => {
    // Clear any previous errors
    setError('');
    
    // Prevent double-clicks
    if (isCreating) {
      console.log('Already creating room, ignoring click');
      return;
    }
    
    // Check connection
    if (connectionStatus !== 'connected') {
      setError(`Not connected to server (${connectionStatus}). Please wait...`);
      return;
    }
    
    if (!socket) {
      setError('Socket not initialized. Please refresh the page.');
      return;
    }
    
    if (!selfId) {
      setError('Connection not ready. Please wait a moment...');
      return;
    }

    console.log('🎮 Starting room creation...');
    console.log('Socket connected:', socket.connected);
    console.log('Self ID:', selfId);
    
    setIsCreating(true);
    startLoadingProgress();

    const payload = {
      name: name.trim() || 'Host',
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

    console.log('📤 Emitting room:create with payload:', payload);

    // Set timeout for room creation
    createTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Room creation timed out');
      setIsCreating(false);
      stopLoadingProgress();
      setError('Room creation timed out. Server might be slow or unavailable. Please try again.');
    }, 10000);

    socket.emit('room:create', payload, (response) => {
      console.log('📥 Received room:create response:', response);
      
      // Clear timeout
      if (createTimeoutRef.current) {
        clearTimeout(createTimeoutRef.current);
        createTimeoutRef.current = null;
      }
      
      stopLoadingProgress();
      setIsCreating(false);
      
      if (response?.ok) {
        console.log('✅ Room created successfully:', response.roomId);
        setRoomState(response.state);
        localStorage.setItem('playerName', name.trim() || 'Host');
        localStorage.setItem('currentRoomId', response.roomId);
        navigate(`/room/${response.roomId}`, { replace: true });
      } else {
        console.error('❌ Room creation failed:', response);
        setError(`Could not create room: ${response?.error || 'Unknown error'}`);
      }
    });
  };

  const handleJoin = () => {
    setError('');
    
    if (isJoining) return;
    
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a room code');
      return;
    }
    
    if (connectionStatus !== 'connected' || !socket) {
      setError('Not connected to server. Please wait...');
      return;
    }

    console.log('🎮 Joining room:', code);
    setIsJoining(true);
    startLoadingProgress();

    joinTimeoutRef.current = setTimeout(() => {
      setIsJoining(false);
      stopLoadingProgress();
      setError('Join request timed out. Please try again.');
    }, 10000);

    socket.emit('room:join', { roomId: code, name: name.trim() || 'Player' }, (res) => {
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      
      stopLoadingProgress();
      setIsJoining(false);
      
      if (res?.ok) {
        console.log('✅ Joined room successfully');
        setRoomState(res.state);
        localStorage.setItem('playerName', name.trim() || 'Player');
        localStorage.setItem('currentRoomId', code);
        navigate(`/room/${code}`, { replace: true });
      } else {
        console.error('❌ Join failed:', res);
        setError(`Could not join room: ${res?.error || 'Room not found or full'}`);
      }
    });
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

  const isLoading = isCreating || isJoining;

  return (
    <div className="landing-page">
      <div className="landing-card">
        {/* Loading Bar */}
        {isLoading && loadingProgress > 0 && (
          <div className="loading-bar-container">
            <div 
              className="loading-bar" 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        )}

        {/* Connection Status */}
        <div className="connection-status" style={{ 
          color: getConnectionStatusColor(),
          borderColor: getConnectionStatusColor()
        }}>
          {getConnectionStatusText()}
        </div>

        {/* Title */}
        <h1 className="landing-title">Doodles</h1>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
            <button className="error-dismiss" onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* Name Input */}
        <div className="landing-field">
          <label className="landing-label">Name</label>
          <input 
            className="landing-input"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="enter your name here...." 
            disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Create Room Button */}
        <button 
          className="create-room-btn"
          onClick={handleCreate}
          disabled={isCreating || connectionStatus !== 'connected'}
        >
          {isCreating ? (
            <>
              <span className="spinner"></span>
              Creating Room...
            </>
          ) : 'Create Room'}
        </button>

        <div className="landing-divider"></div>

        {/* Join Room Section */}
        <div className="join-section">
          <h2 className="section-title">Join Room</h2>
          <div className="join-row">
            <input 
              className="join-input"
              value={roomCode} 
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code..."
              disabled={isLoading}
              maxLength={10}
            />
            <button 
              className="join-btn"
              onClick={handleJoin}
              disabled={isJoining || connectionStatus !== 'connected' || !roomCode.trim()}
            >
              {isJoining ? <span className="spinner"></span> : 'Join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
