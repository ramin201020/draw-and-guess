#!/bin/bash

echo "🛑 Stopping Doodles Game Servers..."

# Stop all PM2 processes
pm2 stop all

echo "✅ All servers stopped!"
echo ""
echo "💡 To start again, run: ./start-servers.sh"