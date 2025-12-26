import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../socket/SocketProvider';

export function LandingPage() {
  const { socket, selfId, setRoomState } = useSocket();
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [maxPoints, setMaxPoints] = useState(300);
  const [roundTimeSec, setRoundTimeSec] = useState(90);
  const [wordsPerRound, setWordsPerRound] = useState(3);
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
    if (!selfId) {
      alert('Connecting to game server... please wait a moment.');
      return;
    }

    const payload = {
      socketId: selfId,
      name: name || 'Host',
      settings: {
        maxPoints: parseNumberOrDefault(maxPoints, 300),
        roundTimeSec: parseNumberOrDefault(roundTimeSec, 90),
        wordsPerRound: parseNumberOrDefault(wordsPerRound, 3),
      },
    };

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        console.warn('Failed to create room via HTTP', data);
        alert('Could not create room. Please try again in a moment.');
        return;
      }

      setRoomState(data.state);
      navigate(`/room/${data.roomId}`);
    } catch (err) {
      console.error('Error creating room via HTTP', err);
      alert('Could not create room. Please check your connection and try again.');
    }
  };

  const handleJoin = () => {
    if (!roomId) return;
    if (!socket || !socket.connected) {
      alert('Connecting to game server... please make sure the server is running.');
      return;
    }
    socket.emit(
      'room:join',
      { roomId: roomId.trim(), name: name || 'Player' },
      (res) => {
        if (res?.ok) {
          setRoomState(res.state);
          navigate(`/room/${roomId.trim()}`);
        }
      }
    );
  };

  return (
    <div className="page neon-bg">
      <div className="card">
        <h1 className="title">Welcome to Doodles</h1>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>

        <div className="section">
          <h2>Create Room</h2>
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
          <button onClick={handleCreate} className="primary-btn landing-main-btn">Create Room</button>
        </div>

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
          <button onClick={handleJoin} className="secondary-btn landing-main-btn">Join by code</button>
        </div>
      </div>
    </div>
  );
}
