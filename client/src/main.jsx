import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './socket/SocketProvider';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';
import './styles.css';

// Make React globally available for Safari compatibility
window.React = React;

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  </React.StrictMode>
);
