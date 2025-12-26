#!/bin/bash

echo "🚀 Deploying Doodles Game to Production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide your domain name${NC}"
    echo "Usage: ./deploy.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1

echo -e "${YELLOW}📋 Deployment Steps:${NC}"
echo "1. Building client for production..."
echo "2. Stopping development servers..."
echo "3. Starting production servers..."
echo "4. Configuring for domain: $DOMAIN"

# Build client
echo -e "${YELLOW}🔨 Building client...${NC}"
cd client
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Client built successfully${NC}"
else
    echo -e "${RED}❌ Client build failed${NC}"
    exit 1
fi
cd ..

# Stop development servers
echo -e "${YELLOW}🛑 Stopping development servers...${NC}"
pm2 delete all 2>/dev/null || true

# Start production servers
echo -e "${YELLOW}🚀 Starting production servers...${NC}"
pm2 start ecosystem.production.js

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Point your domain $DOMAIN to this server's IP"
echo "2. Configure Nginx with the provided config"
echo "3. Set up SSL certificate with Let's Encrypt"
echo ""
echo -e "${YELLOW}🔧 Useful Commands:${NC}"
echo "pm2 status          - Check server status"
echo "pm2 logs            - View server logs"
echo "pm2 restart all     - Restart servers"
echo "pm2 monit           - Monitor servers"
echo ""
echo -e "${GREEN}🌐 Your game will be available at: https://$DOMAIN${NC}"