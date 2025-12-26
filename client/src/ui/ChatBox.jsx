import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/SocketProvider';

export function ChatBox({ roomId }) {
  const { socket, roomState } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages([]);
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (msg) => setMessages((prev) => [...prev, { ...msg, type: 'chat' }]);
    const handleCorrect = ({ playerId }) => {
      const playerName =
        roomState?.players?.find((p) => p.id === playerId)?.name || 'Player';
      setMessages((prev) => [
        ...prev,
        {
          id: `correct-${playerId}-${Date.now()}`,
          name: playerName,
          type: 'correct'
        }
      ]);
    };
    socket.on('chat:message', handleMessage);
    socket.on('guess:correct', handleCorrect);
    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('guess:correct', handleCorrect);
    };
  }, [socket, roomState?.players]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!socket || !input.trim()) return;
    socket.emit('chat:message', { roomId, text: input.trim() });
    setInput('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-box">
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.type === 'correct' ? 'chat-message correct-guess' : 'chat-message'}
          >
            {m.type === 'correct' ? (
              <span>{`${m.name} guessed the word correctly!`}</span>
            ) : (
              <>
                <span className="chat-name">{m.name}:</span> {m.text}
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your guess..."
        />
        <button className="primary-btn" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
