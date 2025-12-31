import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../socket/SocketProvider';

export function VoiceChat({ roomId, selfId, players }) {
  const { socket } = useSocket();
  const [isInVoiceChat, setIsInVoiceChat] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState(new Set());
  const [audioLevels, setAudioLevels] = useState(new Map());
  const [connectionQuality, setConnectionQuality] = useState(new Map());
  
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const remoteAudiosRef = useRef(new Map());
  const pendingCandidatesRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);

  // Enhanced WebRTC configuration with multiple STUN/TURN servers
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10
  };

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isInVoiceChat || isMuted) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 128) * 100);
    
    setAudioLevels(prev => new Map(prev.set(selfId, normalizedLevel)));
    
    // Emit audio level to other participants
    if (socket && normalizedLevel > 5) {
      socket.emit('voice:audio-level', { roomId, level: normalizedLevel });
    }
  }, [socket, roomId, selfId, isInVoiceChat, isMuted]);

  // Monitor connection quality
  const monitorConnectionQuality = useCallback(async (peerId, pc) => {
    try {
      const stats = await pc.getStats();
      let quality = 'good';
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
          const packetsLost = report.packetsLost || 0;
          const packetsReceived = report.packetsReceived || 0;
          const lossRate = packetsLost / (packetsLost + packetsReceived);
          
          if (lossRate > 0.05) quality = 'poor';
          else if (lossRate > 0.02) quality = 'fair';
        }
      });
      
      setConnectionQuality(prev => new Map(prev.set(peerId, quality)));
    } catch (error) {
      console.error('Error monitoring connection quality:', error);
    }
  }, []);

  // Enhanced cleanup function
  const cleanup = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc, peerId) => {
      console.log('Closing peer connection with:', peerId);
      pc.close();
    });
    peerConnectionsRef.current.clear();

    // Remove all remote audio elements
    remoteAudiosRef.current.forEach((audio, peerId) => {
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
      console.log('Removed audio element for:', peerId);
    });
    remoteAudiosRef.current.clear();

    // Clear pending candidates
    pendingCandidatesRef.current.clear();

    setVoiceParticipants(new Set());
    setAudioLevels(new Map());
    setConnectionQuality(new Map());
    setIsInVoiceChat(false);
    setIsConnecting(false);
  }, []);

  // Enhanced peer connection creation
  const createPeerConnection = useCallback((peerId) => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('Sending ICE candidate to:', peerId);
        socket.emit('voice:ice-candidate', {
          roomId,
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId);
      const [remoteStream] = event.streams;
      let audioElement = remoteAudiosRef.current.get(peerId);
      
      if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        audioElement.playsInline = true;
        audioElement.volume = isDeafened ? 0 : 1;
        document.body.appendChild(audioElement);
        remoteAudiosRef.current.set(peerId, audioElement);
        
        // Monitor remote audio levels
        if (audioContextRef.current) {
          const source = audioContextRef.current.createMediaStreamSource(remoteStream);
          const analyser = audioContextRef.current.createAnalyser();
          source.connect(analyser);
          
          const monitorRemoteLevel = () => {
            if (!remoteAudiosRef.current.has(peerId)) return;
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const normalizedLevel = Math.min(100, (average / 128) * 100);
            
            setAudioLevels(prev => new Map(prev.set(peerId, normalizedLevel)));
            
            if (remoteAudiosRef.current.has(peerId)) {
              requestAnimationFrame(monitorRemoteLevel);
            }
          };
          
          requestAnimationFrame(monitorRemoteLevel);
        }
      }
      
      audioElement.srcObject = remoteStream;
    };

    pc.onconnectionstatechange = () => {
      console.log(`Peer connection with ${peerId}: ${pc.connectionState}`);
      
      if (pc.connectionState === 'connected') {
        // Start monitoring connection quality
        const qualityInterval = setInterval(() => {
          if (pc.connectionState === 'connected') {
            monitorConnectionQuality(peerId, pc);
          } else {
            clearInterval(qualityInterval);
          }
        }, 5000);
      }
      
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        const audioElement = remoteAudiosRef.current.get(peerId);
        if (audioElement && audioElement.parentNode) {
          audioElement.parentNode.removeChild(audioElement);
        }
        remoteAudiosRef.current.delete(peerId);
        setAudioLevels(prev => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });
        setConnectionQuality(prev => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });
      }
    };

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind);
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [socket, roomId, isDeafened, monitorConnectionQuality]);

  // Enhanced join voice chat
  const joinVoiceChat = async () => {
    if (isConnecting || isInVoiceChat) return;
    
    setIsConnecting(true);
    
    try {
      console.log('Requesting microphone access...');
      
      // Request high-quality audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          volume: 1.0
        } 
      });
      
      localStreamRef.current = stream;
      
      // Set up audio context for monitoring
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Start audio level monitoring
      const monitorInterval = setInterval(monitorAudioLevel, 100);
      microphoneRef.current = monitorInterval;
      
      setIsInVoiceChat(true);
      console.log('Successfully joined voice chat');
      
      // Notify server
      if (socket) {
        socket.emit('voice:join', { roomId });
      }
      
    } catch (error) {
      console.error('Failed to access microphone:', error);
      let errorMessage = 'Microphone access is required for voice chat.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application.';
      }
      
      alert(errorMessage);
    }
    
    setIsConnecting(false);
  };

  // Enhanced leave voice chat
  const leaveVoiceChat = useCallback(() => {
    console.log('Leaving voice chat...');
    
    if (socket) {
      socket.emit('voice:leave', { roomId });
    }
    
    if (microphoneRef.current) {
      clearInterval(microphoneRef.current);
      microphoneRef.current = null;
    }
    
    cleanup();
  }, [socket, roomId, cleanup]);

  // Enhanced toggle mute with visual feedback
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        console.log('Microphone', audioTrack.enabled ? 'unmuted' : 'muted');
        
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

  // Toggle deafen (mute all incoming audio)
  const toggleDeafen = () => {
    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);
    
    // Mute/unmute all remote audio elements
    remoteAudiosRef.current.forEach(audio => {
      audio.volume = newDeafenState ? 0 : 1;
    });
    
    console.log('Audio', newDeafenState ? 'deafened' : 'undeafened');
  };

  // Socket event handlers with enhanced error handling
  useEffect(() => {
    if (!socket) return;

    const handleVoiceParticipants = (participants) => {
      console.log('Voice participants updated:', participants);
      setVoiceParticipants(new Set(participants));
    };

    const handleVoiceUserJoined = async ({ userId }) => {
      if (userId === selfId || !isInVoiceChat) return;
      
      console.log(`User ${userId} joined voice chat`);
      
      try {
        const pc = createPeerConnection(userId);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });
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
      
      const pc = peerConnectionsRef.current.get(userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }
      
      const audioElement = remoteAudiosRef.current.get(userId);
      if (audioElement && audioElement.parentNode) {
        audioElement.parentNode.removeChild(audioElement);
      }
      remoteAudiosRef.current.delete(userId);
      
      setAudioLevels(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
      setConnectionQuality(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    };

    const handleVoiceOffer = async ({ fromId, offer }) => {
      if (!isInVoiceChat) return;
      
      console.log(`Received offer from ${fromId}`);
      
      try {
        const pc = createPeerConnection(fromId);
        await pc.setRemoteDescription(offer);
        
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
        if (!pendingCandidatesRef.current.has(fromId)) {
          pendingCandidatesRef.current.set(fromId, []);
        }
        pendingCandidatesRef.current.get(fromId).push(candidate);
      }
    };

    const handleVoiceAudioLevel = ({ userId, level }) => {
      setAudioLevels(prev => new Map(prev.set(userId, level)));
    };

    socket.on('voice:participants', handleVoiceParticipants);
    socket.on('voice:user-joined', handleVoiceUserJoined);
    socket.on('voice:user-left', handleVoiceUserLeft);
    socket.on('voice:offer', handleVoiceOffer);
    socket.on('voice:answer', handleVoiceAnswer);
    socket.on('voice:ice-candidate', handleVoiceIceCandidate);
    socket.on('voice:audio-level', handleVoiceAudioLevel);

    return () => {
      socket.off('voice:participants', handleVoiceParticipants);
      socket.off('voice:user-joined', handleVoiceUserJoined);
      socket.off('voice:user-left', handleVoiceUserLeft);
      socket.off('voice:offer', handleVoiceOffer);
      socket.off('voice:answer', handleVoiceAnswer);
      socket.off('voice:ice-candidate', handleVoiceIceCandidate);
      socket.off('voice:audio-level', handleVoiceAudioLevel);
    };
  }, [socket, roomId, selfId, isInVoiceChat, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Check WebRTC support
  const isWebRTCSupported = !!(
    navigator.mediaDevices && 
    navigator.mediaDevices.getUserMedia && 
    window.RTCPeerConnection &&
    window.AudioContext || window.webkitAudioContext
  );

  if (!isWebRTCSupported) {
    return (
      <div className="voice-chat-unsupported">
        <span style={{ fontSize: '11px', color: '#999' }}>Voice chat not supported</span>
      </div>
    );
  }

  return (
    <div className="voice-chat-controls">
      {!isInVoiceChat ? (
        <button 
          className="join-voice-btn" 
          onClick={joinVoiceChat}
          disabled={isConnecting}
        >
          {isConnecting ? '...' : '🎤 Voice'}
        </button>
      ) : (
        <div className="voice-chat-active">
          <span className="voice-count">🎤 {voiceParticipants.size}</span>
          <button 
            className={`voice-control-btn ${isMuted ? 'muted' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button 
            className={`voice-control-btn ${isDeafened ? 'deafened' : ''}`}
            onClick={toggleDeafen}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? '🔇' : '🔊'}
          </button>
          <button 
            className="voice-control-btn leave-voice-btn"
            onClick={leaveVoiceChat}
            title="Leave Voice"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}