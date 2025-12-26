import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './socket/SocketProvider';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <SocketProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  </SocketProvider>
);
