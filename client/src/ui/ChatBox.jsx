import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/SocketProvider';

export function ChatBox({ roomId }) {
  const { socket, roomState } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Clear messages when room changes
  useEffect(() => {
    setMessages([]);
  }, [roomId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, { ...msg, type: 'chat' }]);
    };
    
    const handleCorrect = ({ playerId }) => {
      const playerName = roomState?.players?.find((p) => p.id === playerId)?.name || 'Player';
      setMessages((prev) => [
        ...prev,
        {
          id: `correct-${playerId}-${Date.now()}`,
          name: playerName,
          type: 'correct'
        }
      ]);
    };
    
    const handleSystemMessage = (msg) => {
      setMessages((prev) => [...prev, { ...msg, type: 'system' }]);
    };
    
    socket.on('chat:message', handleMessage);
    socket.on('guess:correct', handleCorrect);
    socket.on('chat:system', handleSystemMessage);
    
    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('guess:correct', handleCorrect);
      socket.off('chat:system', handleSystemMessage);
    };
  }, [socket, roomState?.players]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!socket || !input.trim()) return;
    socket.emit('chat:message', { roomId, text: input.trim() });
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.type}`}>
            {msg.type === 'correct' ? (
              <span className="correct-text">🎉 {msg.name} guessed the word!</span>
            ) : msg.type === 'system' ? (
              <span className="system-text">{msg.text}</span>
            ) : (
              <>
                <span className="msg-name">{msg.name}:</span>
                <span className="msg-text">{msg.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your guess here..."
          maxLength={100}
        />
        <button className="send-btn" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
