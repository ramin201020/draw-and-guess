#!/bin/bash

echo "🚀 Starting Doodles Production Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed. Installing PM2...${NC}"
    npm install -g pm2
fi

# Stop any existing processes
echo -e "${YELLOW}🛑 Stopping existing processes...${NC}"
pm2 delete doodles-server 2>/dev/null || true

# Start the production server
echo -e "${YELLOW}🚀 Starting production server...${NC}"
pm2 start ecosystem.production.js

# Save PM2 configuration for auto-restart
pm2 save

# Setup PM2 startup script (run on system boot)
pm2 startup

echo -e "${GREEN}✅ Production server started successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Server Status:${NC}"
pm2 status

echo ""
echo -e "${YELLOW}🌐 Your backend is now running and accessible to:${NC}"
echo "• Vercel frontend: https://doodles-seven.vercel.app"
echo "• Local development: http://localhost:5174"
echo "• Any other frontend that connects to: https://doodles-giok.onrender.com"
echo ""
echo -e "${YELLOW}🔧 Useful Commands:${NC}"
echo "pm2 status          - Check server status"
echo "pm2 logs            - View server logs"
echo "pm2 restart all     - Restart servers"
echo "pm2 stop all        - Stop servers"
echo "pm2 monit           - Monitor servers"
echo ""
echo -e "${GREEN}🎮 Your Doodles game is ready!${NC}"