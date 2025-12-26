# 🚀 Production Deployment Guide

## Option 1: DigitalOcean Droplet (Recommended)

### Step 1: Create Server
1. Sign up at DigitalOcean
2. Create a new Droplet (Ubuntu 22.04, $5/month)
3. Note your server IP address

### Step 2: Setup Server
```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Nginx (web server)
apt install nginx -y

# Install Git
apt install git -y
```

### Step 3: Deploy Your Code
```bash
# Clone your repository
git clone https://github.com/ramin201020/draw-and-guess.git
cd draw-and-guess

# Install dependencies
npm run install:all

# Build client for production
cd client
npm run build
cd ..

# Start servers with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Step 4: Configure Nginx
```bash
# Create Nginx config
nano /etc/nginx/sites-available/doodles-game

# Add this configuration:
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

    # Serve React app
    location / {
        root /root/draw-and-guess/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable the site
ln -s /etc/nginx/sites-available/doodles-game /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 5: Setup Domain
1. Point your domain to your server IP
2. Wait for DNS propagation (up to 24 hours)

### Step 6: Add SSL Certificate (HTTPS)
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
```

## Option 2: Vercel + Railway (Easier, Free Tier)

### Frontend (Vercel)
1. Push code to GitHub
2. Connect Vercel to your GitHub repo
3. Deploy automatically

### Backend (Railway)
1. Sign up at Railway.app
2. Deploy from GitHub
3. Set environment variables

## Option 3: Heroku (Simple but Paid)

### Prepare for Heroku
```bash
# Install Heroku CLI
# Create Procfile in root directory
echo "web: npm start" > Procfile

# Create start script that serves both
```