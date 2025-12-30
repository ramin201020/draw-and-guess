import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// Hardcoded backend URL
const BACKEND_URL = 'https://doodles-giok.onrender.com';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    console.log('🚀 Connecting to:', BACKEND_URL);

    const s = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      forceNew: true,
      withCredentials: true
    });

    setSocket(s);

    s.on('connect', () => {
      console.log('✅ Connected with ID:', s.id);
      setSelfId(s.id);
      setConnectionStatus('connected');
    });

    s.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      setConnectionStatus('disconnected');
      setSelfId(null);
    });

    s.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error.message, error.type);
      setConnectionStatus('error');
    });

    s.on('reconnect', () => {
      console.log('🔄 Reconnected');
      setConnectionStatus('connected');
    });

    s.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
    });

    s.on('room:state', (state) => {
      setRoomState(state);
      if (state?.id) localStorage.setItem('currentRoomId', state.id);
    });

    s.on('round:end', ({ state }) => setRoomState(state));
    s.on('room:closed', () => { setRoomState(null); localStorage.removeItem('currentRoomId'); });
    s.on('room:kicked', () => { setRoomState(null); localStorage.removeItem('currentRoomId'); });

    s.on('round:maskUpdate', ({ roomId, mask }) => {
      setRoomState((prev) => {
        if (!prev || prev.id !== roomId || !prev.currentRound) return prev;
        return { ...prev, currentRound: { ...prev.currentRound, mask } };
      });
    });

    s.on('round:start', ({ drawerId, endsAt, mask }) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'IN_ROUND',
          currentRound: { ...(prev.currentRound || {}), drawerId, endsAt, mask: mask || prev.currentRound?.mask || null }
        };
      });
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, []);

  const value = useMemo(() => ({ 
    socket, roomState, selfId, connectionStatus, setRoomState 
  }), [socket, roomState, selfId, connectionStatus]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
