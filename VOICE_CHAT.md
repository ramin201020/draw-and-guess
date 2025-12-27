# Voice Chat Feature Documentation

## Overview
The Doodles game now includes a built-in voice chat system that allows players to communicate with each other in real-time during gameplay. This feature uses WebRTC (Web Real-Time Communication) for peer-to-peer audio streaming.

## Features

### ✅ Core Functionality
- **Audio-only communication** - No video, just voice
- **Microphone mute/unmute** - Toggle your microphone on/off
- **Leave voice chat** - Exit voice chat at any time
- **Visual indicators** - See who's in voice chat and who's muted
- **Real-time updates** - Instant feedback when users join/leave

### 🎤 User Controls
1. **Join Voice Chat** - Click the "🎤 Join Voice Chat" button
2. **Mute/Unmute** - Click the microphone icon (🎤/🔇)
3. **Leave Voice Chat** - Click the phone icon (📞)

### 👥 Player Indicators
- **Green border** - Player is in voice chat and unmuted
- **Red border** - Player is in voice chat but muted
- **Microphone icon** - Shows next to player name when in voice
- **Participant count** - Shows how many players are in voice chat

## Technical Implementation

### Frontend (React)
- **Component**: `client/src/ui/VoiceChat.jsx`
- **Technology**: WebRTC API, RTCPeerConnection
- **Audio Processing**: Echo cancellation, noise suppression, auto gain control

### Backend (Node.js)
- **Server**: `server/index.js`
- **Signaling**: Socket.IO for WebRTC signaling
- **Events**: voice:join, voice:leave, voice:offer, voice:answer, voice:ice-candidate

### WebRTC Flow
1. User clicks "Join Voice Chat"
2. Browser requests microphone permission
3. Local audio stream is created
4. Socket.IO signals other participants
5. WebRTC peer connections are established
6. Audio streams are exchanged peer-to-peer

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge (Chromium) - Full support
- ✅ Firefox - Full support
- ✅ Safari (iOS/macOS) - Full support
- ✅ Opera - Full support

### Requirements
- **HTTPS** - Required for microphone access (except localhost)
- **Microphone permission** - User must grant access
- **WebRTC support** - Modern browsers only

## Security & Privacy

### Permissions
- Microphone access is requested only when joining voice chat
- Users can deny permission and still play the game
- Permission can be revoked at any time in browser settings

### Data Flow
- **Peer-to-peer** - Audio streams directly between users
- **No recording** - Audio is not recorded or stored
- **Encrypted** - WebRTC uses DTLS-SRTP encryption
- **Server role** - Only handles signaling, not audio data

## Usage Tips

### For Players
1. **Test your mic** - Join voice chat in lobby to test
2. **Use headphones** - Prevents echo and feedback
3. **Mute when not speaking** - Reduces background noise
4. **Check indicators** - Green border = you're connected

### For Hosts
1. **Encourage voice chat** - Better communication = better gameplay
2. **Remind about mute** - Ask players to mute when not speaking
3. **Test before starting** - Make sure everyone can hear

## Troubleshooting

### Can't Join Voice Chat
- **Check microphone permission** - Allow in browser settings
- **Check browser compatibility** - Use a modern browser
- **Reload the page** - Sometimes fixes connection issues
- **Check microphone** - Make sure it's not used by another app

### Can't Hear Others
- **Check volume** - Increase system/browser volume
- **Check audio output** - Make sure correct device is selected
- **Ask others to unmute** - They might be muted
- **Reload the page** - Reconnect to voice chat

### Echo or Feedback
- **Use headphones** - Prevents speaker audio from entering mic
- **Reduce volume** - Lower speaker volume
- **Mute when not speaking** - Reduces feedback loops

### Poor Audio Quality
- **Check internet connection** - Weak connection affects quality
- **Close other apps** - Free up bandwidth
- **Move closer to router** - Better WiFi signal
- **Reduce background noise** - Find a quieter location

## Development Notes

### Adding New Features
The voice chat system is modular and can be extended:
- Add volume indicators (audio level visualization)
- Add push-to-talk functionality
- Add spatial audio (positional audio)
- Add voice effects or filters

### Configuration
WebRTC configuration in `VoiceChat.jsx`:
```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};
```

### Audio Constraints
```javascript
audio: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
}
```

## Future Enhancements
- [ ] Volume level indicators
- [ ] Push-to-talk mode
- [ ] Voice activity detection
- [ ] Audio recording for replays
- [ ] Custom TURN server for better connectivity
- [ ] Voice chat rooms (separate channels)
- [ ] Admin controls (mute others, kick from voice)

## Support
For issues or questions about voice chat:
1. Check browser console for errors
2. Verify microphone permissions
3. Test with different browsers
4. Check network connectivity
5. Review this documentation

---

**Note**: Voice chat requires a stable internet connection and modern browser. For the best experience, use headphones and a good quality microphone.
