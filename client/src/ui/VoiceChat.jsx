import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../socket/SocketProvider';

export function VoiceChat({ roomId, selfId, players }) {
  const { socket } = useSocket();
  const [isInVoiceChat, setIsInVoiceChat] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState(new Set());
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const remoteAudiosRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  // Clean up function
  const cleanup = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Remove all remote audio elements
    remoteAudiosRef.current.forEach(audio => {
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
    });
    remoteAudiosRef.current.clear();

    // Clear pending candidates
    pendingCandidatesRef.current.clear();

    setVoiceParticipants(new Set());
    setIsInVoiceChat(false);
    setIsConnecting(false);
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((peerId) => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('voice:ice-candidate', {
          roomId,
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      let audioElement = remoteAudiosRef.current.get(peerId);
      
      if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        audioElement.playsInline = true;
        document.body.appendChild(audioElement);
        remoteAudiosRef.current.set(peerId, audioElement);
      }
      
      audioElement.srcObject = remoteStream;
    };

    pc.onconnectionstatechange = () => {
      console.log(`Peer connection with ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        // Remove audio element for disconnected peer
        const audioElement = remoteAudiosRef.current.get(peerId);
        if (audioElement && audioElement.parentNode) {
          audioElement.parentNode.removeChild(audioElement);
        }
        remoteAudiosRef.current.delete(peerId);
      }
    };

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [socket, roomId]);

  // Join voice chat
  const joinVoiceChat = async () => {
    if (isConnecting || isInVoiceChat) return;
    
    setIsConnecting(true);
    
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      localStreamRef.current = stream;
      setAudioPermissionGranted(true);
      setIsInVoiceChat(true);
      
      // Notify server that we joined voice chat
      if (socket) {
        socket.emit('voice:join', { roomId });
      }
      
    } catch (error) {
      console.error('Failed to access microphone:', error);
      alert('Microphone access is required for voice chat. Please allow microphone access and try again.');
      setAudioPermissionGranted(false);
    }
    
    setIsConnecting(false);
  };

  // Leave voice chat
  const leaveVoiceChat = useCallback(() => {
    if (socket) {
      socket.emit('voice:leave', { roomId });
    }
    cleanup();
  }, [socket, roomId, cleanup]);

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        // Notify others about mute status
        if (socket) {
          socket.emit('voice:mute-status', { 
            roomId, 
            isMuted: !audioTrack.enabled 
          });
        }
      }
    }
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleVoiceParticipants = (participants) => {
      setVoiceParticipants(new Set(participants));
    };

    const handleVoiceUserJoined = async ({ userId }) => {
      if (userId === selfId || !isInVoiceChat) return;
      
      console.log(`User ${userId} joined voice chat`);
      
      // Create offer for new user
      const pc = createPeerConnection(userId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket.emit('voice:offer', {
          roomId,
          targetId: userId,
          offer: offer
        });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    };

    const handleVoiceUserLeft = ({ userId }) => {
      console.log(`User ${userId} left voice chat`);
      
      // Close peer connection
      const pc = peerConnectionsRef.current.get(userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }
      
      // Remove audio element
      const audioElement = remoteAudiosRef.current.get(userId);
      if (audioElement && audioElement.parentNode) {
        audioElement.parentNode.removeChild(audioElement);
      }
      remoteAudiosRef.current.delete(userId);
    };

    const handleVoiceOffer = async ({ fromId, offer }) => {
      if (!isInVoiceChat) return;
      
      console.log(`Received offer from ${fromId}`);
      
      const pc = createPeerConnection(fromId);
      try {
        await pc.setRemoteDescription(offer);
        
        // Process any pending candidates
        const candidates = pendingCandidatesRef.current.get(fromId) || [];
        for (const candidate of candidates) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current.delete(fromId);
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('voice:answer', {
          roomId,
          targetId: fromId,
          answer: answer
        });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    };

    const handleVoiceAnswer = async ({ fromId, answer }) => {
      console.log(`Received answer from ${fromId}`);
      
      const pc = peerConnectionsRef.current.get(fromId);
      if (pc) {
        try {
          await pc.setRemoteDescription(answer);
          
          // Process any pending candidates
          const candidates = pendingCandidatesRef.current.get(fromId) || [];
          for (const candidate of candidates) {
            await pc.addIceCandidate(candidate);
          }
          pendingCandidatesRef.current.delete(fromId);
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      }
    };

    const handleVoiceIceCandidate = async ({ fromId, candidate }) => {
      const pc = peerConnectionsRef.current.get(fromId);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          console.error('Error adding ice candidate:', error);
        }
      } else {
        // Store candidate for later
        if (!pendingCandidatesRef.current.has(fromId)) {
          pendingCandidatesRef.current.set(fromId, []);
        }
        pendingCandidatesRef.current.get(fromId).push(candidate);
      }
    };

    socket.on('voice:participants', handleVoiceParticipants);
    socket.on('voice:user-joined', handleVoiceUserJoined);
    socket.on('voice:user-left', handleVoiceUserLeft);
    socket.on('voice:offer', handleVoiceOffer);
    socket.on('voice:answer', handleVoiceAnswer);
    socket.on('voice:ice-candidate', handleVoiceIceCandidate);

    return () => {
      socket.off('voice:participants', handleVoiceParticipants);
      socket.off('voice:user-joined', handleVoiceUserJoined);
      socket.off('voice:user-left', handleVoiceUserLeft);
      socket.off('voice:offer', handleVoiceOffer);
      socket.off('voice:answer', handleVoiceAnswer);
      socket.off('voice:ice-candidate', handleVoiceIceCandidate);
    };
  }, [socket, roomId, selfId, isInVoiceChat, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Check if browser supports WebRTC
  const isWebRTCSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection);

  if (!isWebRTCSupported) {
    return (
      <div className="voice-chat-unsupported">
        <span>🎤 Voice chat not supported in this browser</span>
      </div>
    );
  }

  return (
    <div className="voice-chat-controls">
      {!isInVoiceChat ? (
        <button 
          className="voice-chat-btn join" 
          onClick={joinVoiceChat}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>🔄 Connecting...</>
          ) : (
            <>🎤 Join Voice Chat</>
          )}
        </button>
      ) : (
        <div className="voice-chat-active">
          <div className="voice-participants">
            <span className="voice-count">
              🎤 {voiceParticipants.size} in voice
            </span>
          </div>
          <div className="voice-controls">
            <button 
              className={`voice-control-btn ${isMuted ? 'muted' : 'unmuted'}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            <button 
              className="voice-control-btn leave"
              onClick={leaveVoiceChat}
              title="Leave Voice Chat"
            >
              📞
            </button>
          </div>
        </div>
      )}
    </div>
  );
}