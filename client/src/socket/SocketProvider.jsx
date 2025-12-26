import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  console.log('🚀 SocketProvider component mounted/re-rendered');

  useEffect(() => {
    console.log('🔄 SocketProvider useEffect triggered - starting connection process');
    // Use proxy in development for socket connection
    const backendUrl = import.meta.env.PROD 
      ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000')
      : 'http://localhost:4000'; // Direct connection in development
    
    console.log('🚀 SocketProvider useEffect triggered');
    console.log('🌐 Attempting to connect to:', backendUrl);
    console.log('🔧 Environment:', import.meta.env.MODE);
    console.log('🏭 Production mode:', import.meta.env.PROD);

    const s = io(backendUrl, {
      // Connection optimization for faster connection
      transports: ['websocket', 'polling'], // Prefer websocket, fallback to polling
      upgrade: true,
      rememberUpgrade: true,
      // Reduced timeouts for faster connection
      timeout: 5000,
      forceNew: false,
      // Security settings
      withCredentials: false,
      // Aggressive reconnection for faster recovery
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500, // Reduced from 1000ms
      reconnectionDelayMax: 2000, // Reduced from 5000ms
      maxReconnectionAttempts: 5
    });

    console.log('📡 Socket instance created:', s);
    console.log('🔧 Socket options:', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true
    });
    setSocket(s);

    // Test connection immediately
    setTimeout(() => {
      console.log('🧪 Testing socket connection after 2 seconds...');
      console.log('🔗 Socket connected:', s.connected);
      console.log('🆔 Socket ID:', s.id);
      console.log('🚀 Socket ready state:', s.readyState);
    }, 2000);

    // Connection status tracking
    s.on('connect', () => {
      console.log('✅ Socket connected successfully:', s.id);
      console.log('🔗 Socket connected state:', s.connected);
      setSelfId(s.id);
      setConnectionStatus('connected');
    });

    s.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      console.log('🔗 Socket connected state:', s.connected);
      setConnectionStatus('disconnected');
      setSelfId(null);
    });

    s.on('connect_error', (error) => {
      console.error('🔥 Socket connection error:', error);
      console.log('🔗 Error details:', error.message, error.type);
      setConnectionStatus('error');
    });

    s.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setConnectionStatus('connected');
    });

    s.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket reconnection attempt:', attemptNumber);
      setConnectionStatus('reconnecting');
    });

    s.on('reconnect_error', (error) => {
      console.error('🔥 Socket reconnection error:', error);
    });

    s.on('reconnect_failed', () => {
      console.error('💀 Socket reconnection failed - giving up');
      setConnectionStatus('failed');
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
      s.off('reconnect_error');
      s.off('reconnect_failed');
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
