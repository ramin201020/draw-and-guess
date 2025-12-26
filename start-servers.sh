#!/bin/bash

echo "🚀 Starting Doodles Game Servers..."

# Create logs directory
mkdir -p logs

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pm2 delete doodles-server doodles-client 2>/dev/null || true

# Start the servers
echo "🔥 Starting servers with PM2..."
pm2 start ecosystem.config.js

# Show status
echo "📊 Server Status:"
pm2 status

echo ""
echo "✅ Servers are now running independently!"
echo "🌐 Client: http://localhost:5173/"
echo "🔧 Server: http://localhost:4000/"
echo ""
echo "📋 Useful commands:"
echo "  pm2 status          - Check server status"
echo "  pm2 logs            - View all logs"
echo "  pm2 stop all        - Stop all servers"
echo "  pm2 restart all     - Restart all servers"
echo "  pm2 delete all      - Remove all processes"