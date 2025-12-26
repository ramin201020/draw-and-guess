import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    // Use proxy in development, direct URL in production
    const backendUrl = import.meta.env.PROD 
      ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000')
      : '/'; // Use proxy in development

    const s = io(backendUrl, {
      // Connection optimization
      transports: ['websocket', 'polling'], // Prefer websocket, fallback to polling
      upgrade: true,
      rememberUpgrade: true,
      // Performance settings
      timeout: 5000,
      forceNew: false,
      // Security settings
      withCredentials: false,
      // Reconnection settings for reliability
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5
    });

    setSocket(s);

    // Connection status tracking
    s.on('connect', () => {
      console.log('Socket connected:', s.id);
      setSelfId(s.id);
      setConnectionStatus('connected');
    });

    s.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    s.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('error');
    });

    s.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setConnectionStatus('connected');
    });

    s.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
      setConnectionStatus('reconnecting');
    });

    // Game event handlers
    s.on('room:state', (state) => setRoomState(state));
    s.on('round:end', ({ state }) => setRoomState(state));
    s.on('room:closed', () => setRoomState(null));
    s.on('room:kicked', () => setRoomState(null));
    
    s.on('round:maskUpdate', ({ roomId, mask }) => {
      setRoomState((prev) => {
        if (!prev || prev.id !== roomId) return prev;
        if (!prev.currentRound) return prev;
        return {
          ...prev,
          currentRound: { ...prev.currentRound, mask }
        };
      });
    });
    
    s.on('round:start', ({ drawerId, endsAt, mask }) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'IN_ROUND',
          currentRound: {
            ...(prev.currentRound || {}),
            drawerId,
            endsAt,
            mask: mask || prev.currentRound?.mask || null
          }
        };
      });
    });

    return () => {
      s.off('connect');
      s.off('disconnect');
      s.off('connect_error');
      s.off('reconnect');
      s.off('reconnect_attempt');
      s.off('room:state');
      s.off('round:end');
      s.off('room:closed');
      s.off('room:kicked');
      s.off('round:maskUpdate');
      s.off('round:start');
      s.disconnect();
    };
  }, []);

  const value = useMemo(() => ({ 
    socket, 
    roomState, 
    selfId, 
    connectionStatus,
    setRoomState 
  }), [socket, roomState, selfId, connectionStatus]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
