import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/SocketProvider';

export function ChatBox({ roomId }) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (msg) => setMessages((prev) => [...prev, msg]);
    socket.on('chat:message', handleMessage);
    return () => socket.off('chat:message', handleMessage);
  }, [socket]);

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
        {messages.map((m) => {
          const isCorrectGuess = m?.text && m.text.toLowerCase().includes('has guessed the word correctly');
          if (isCorrectGuess) {
            return (
              <div key={m.id} className="chat-message correct-guess">
                <span>{`${m.name} has guessed the word correctly`}</span>
              </div>
            );
          }
          return (
            <div key={m.id} className="chat-message">
              <span className="chat-name">{m.name}:</span> {m.text}
            </div>
          );
        })}
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
