import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [selfId, setSelfId] = useState(null);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
    const s = io(backendUrl);
    setSocket(s);
    s.on('connect', () => setSelfId(s.id));
    s.on('room:state', (state) => setRoomState(state));
    s.on('round:end', ({ state }) => setRoomState(state));
    s.on('room:closed', () => setRoomState(null));
    s.on('room:kicked', () => setRoomState(null));
    return () => { s.disconnect(); };
  }, []);

  const value = useMemo(() => ({ socket, roomState, selfId, setRoomState }), [socket, roomState, selfId]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
