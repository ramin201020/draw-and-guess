# 🎨 Doodles - Draw and Guess Game

A real-time multiplayer drawing and guessing game built with React, Node.js, and Socket.IO.

## 🚀 Quick Start

### Option 1: Simple Development (Kiro managed)
```bash
npm run dev
```

### Option 2: Independent Servers (runs without Kiro)
```bash
# Start servers independently
./start-servers.sh

# Or using npm
npm start
```

## 🌐 Access the Game

- **Frontend**: http://localhost:5173/
- **Backend**: http://localhost:4000/

## 🎮 How to Play

1. **Create Room**: Enter your name and click "Create Room"
2. **Share Code**: Share the room code with friends
3. **Join Room**: Friends enter the code and click "Join by code"
4. **Start Game**: Host clicks "Start Game" when ready
5. **Draw & Guess**: Take turns drawing and guessing words!

## 🛠️ Development Commands

### Basic Commands
```bash
npm run dev              # Start both servers with concurrently
npm run dev:client       # Start only client
npm run dev:server       # Start only server
npm run install:all      # Install all dependencies
```

### PM2 Commands (Independent Servers)
```bash
npm start               # Start servers with PM2
npm stop                # Stop all servers
npm run pm2:status      # Check server status
npm run pm2:logs        # View server logs
npm run pm2:start       # Start with PM2
npm run pm2:stop        # Stop PM2 processes
```

### Manual PM2 Commands
```bash
pm2 start ecosystem.config.js    # Start servers
pm2 status                       # Check status
pm2 logs                         # View logs
pm2 stop all                     # Stop all
pm2 restart all                  # Restart all
pm2 delete all                   # Remove all processes
```

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── ui/            # UI components
│   │   ├── socket/        # Socket.IO client
│   │   └── styles.css     # Global styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js           # Main server file
│   └── package.json
├── ecosystem.config.js     # PM2 configuration
├── start-servers.sh        # Start script
├── stop-servers.sh         # Stop script
└── package.json           # Root package.json
```

## 🎨 Features

- **Real-time Drawing**: Canvas with multiple tools and colors
- **Live Chat**: Guess words through chat
- **Voice Chat**: Built-in voice communication during gameplay 🎤
- **Room System**: Create and join private rooms
- **Scoring**: Points for correct guesses
- **Host Controls**: Start games, kick players, end rounds
- **Leave/Join**: Players can leave and join anytime
- **Dark Theme**: Modern orange-accented dark UI
- **Responsive**: Works on desktop and mobile

## 🎤 Voice Chat

The game includes a built-in voice chat system for better communication:

- **Audio-only** - No video, just voice
- **Mute/Unmute** - Toggle your microphone
- **Visual indicators** - See who's in voice and who's muted
- **Peer-to-peer** - Direct audio streaming using WebRTC
- **Secure** - Encrypted audio, no recording

See [VOICE_CHAT.md](VOICE_CHAT.md) for detailed documentation.

## 🔧 Technical Stack

- **Frontend**: React, Vite, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Styling**: CSS Custom Properties, Dark Theme
- **Process Management**: PM2 (optional)

## 🚀 Deployment

For production deployment, build the client and serve it:

```bash
cd client && npm run build
# Serve the dist folder with your preferred static server
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

ISC License - feel free to use and modify!

---

**Enjoy drawing and guessing with friends! 🎨🎮**