# ChatApp Deployment Guide for Ubuntu Server

## Overview
This guide will help you deploy your ChatApp to `chatapp.tripstarsholidays.com` on your Ubuntu server.

## Prerequisites
- Ubuntu server with root/sudo access
- Domain name pointing to your server IP
- Basic knowledge of Linux commands

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Required Packages
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3.11-pip

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 1.3 Start Services
```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 2: Application Deployment

### 2.1 Create Application Directory
```bash
sudo mkdir -p /var/www/chatapp
sudo chown -R $USER:$USER /var/www/chatapp
cd /var/www/chatapp
```

### 2.2 Upload Your Code
```bash
# Option 1: Upload via SCP (from your local machine)
scp -r /path/to/your/ChatApp/* user@your-server-ip:/var/www/chatapp/

# Option 2: Clone from Git (if you have a repository)
git clone https://github.com/yourusername/chatapp.git .
```

### 2.3 Backend Setup
```bash
cd /var/www/chatapp/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
nano .env
```

### 2.4 Backend Environment Configuration
Create `/var/www/chatapp/backend/.env`:
```env
SECRET_KEY=your-super-secret-key-here
MONGODB_URL=mongodb://localhost:27017/chatapp
CORS_ORIGINS=https://chatapp.tripstarsholidays.com
```

### 2.5 Frontend Setup
```bash
cd /var/www/chatapp/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### 2.6 Frontend Environment Configuration
Create `/var/www/chatapp/frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://chatapp.tripstarsholidays.com/api
NEXT_PUBLIC_WS_URL=wss://chatapp.tripstarsholidays.com
```

## Step 3: Nginx Configuration

### 3.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/chatapp
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name chatapp.tripstarsholidays.com;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/chatapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 4: Process Management with PM2

### 4.1 Backend PM2 Configuration
Create `/var/www/chatapp/backend/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'chatapp-backend',
    script: 'main.py',
    interpreter: '/var/www/chatapp/backend/venv/bin/python',
    cwd: '/var/www/chatapp/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/chatapp-backend-error.log',
    out_file: '/var/log/pm2/chatapp-backend-out.log',
    log_file: '/var/log/pm2/chatapp-backend.log'
  }]
};
```

### 4.2 Frontend PM2 Configuration
Create `/var/www/chatapp/frontend/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'chatapp-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/chatapp/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/chatapp-frontend-error.log',
    out_file: '/var/log/pm2/chatapp-frontend-out.log',
    log_file: '/var/log/pm2/chatapp-frontend.log'
  }]
};
```

### 4.3 Start Applications
```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Start backend
cd /var/www/chatapp/backend
pm2 start ecosystem.config.js

# Start frontend
cd /var/www/chatapp/frontend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

## Step 5: SSL Certificate Setup

### 5.1 Get SSL Certificate
```bash
sudo certbot --nginx -d chatapp.tripstarsholidays.com
```

### 5.2 Auto-renewal
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 6: Firewall Configuration

### 6.1 Configure UFW
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Step 7: Database Setup

### 7.1 Create Database and User
```bash
mongo
```

In MongoDB shell:
```javascript
use chatapp
db.createUser({
  user: "chatapp_user",
  pwd: "your-secure-password",
  roles: [
    { role: "readWrite", db: "chatapp" }
  ]
})
exit
```

### 7.2 Update MongoDB Configuration
```bash
sudo nano /etc/mongod.conf
```

Add authentication:
```yaml
security:
  authorization: enabled
```

Restart MongoDB:
```bash
sudo systemctl restart mongod
```

## Step 8: Monitoring and Logs

### 8.1 PM2 Monitoring
```bash
pm2 status
pm2 logs
pm2 monit
```

### 8.2 Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Step 9: Backup Strategy

### 9.1 Database Backup Script
Create `/var/www/chatapp/backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db chatapp --out /var/backups/mongodb/chatapp_$DATE
find /var/backups/mongodb -type d -mtime +7 -exec rm -rf {} \;
```

### 9.2 Setup Cron Job
```bash
sudo crontab -e
# Add this line for daily backups at 2 AM:
0 2 * * * /var/www/chatapp/backup.sh
```

## Step 10: Security Hardening

### 10.1 Update Backend Security
Update your backend `.env`:
```env
SECRET_KEY=your-very-long-random-secret-key-here
MONGODB_URL=mongodb://chatapp_user:your-secure-password@localhost:27017/chatapp
CORS_ORIGINS=https://chatapp.tripstarsholidays.com
```

### 10.2 Fail2Ban Setup
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Troubleshooting

### Common Issues:

1. **Port Already in Use**:
   ```bash
   sudo netstat -tulpn | grep :3000
   sudo netstat -tulpn | grep :8000
   ```

2. **Permission Issues**:
   ```bash
   sudo chown -R $USER:$USER /var/www/chatapp
   sudo chmod -R 755 /var/www/chatapp
   ```

3. **MongoDB Connection Issues**:
   ```bash
   sudo systemctl status mongod
   sudo journalctl -u mongod
   ```

4. **Nginx Configuration Test**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Deployment Commands Summary

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs python3.11 python3.11-venv python3.11-pip mongodb-org nginx
sudo npm install -g pm2

# 3. Setup application
sudo mkdir -p /var/www/chatapp
sudo chown -R $USER:$USER /var/www/chatapp
cd /var/www/chatapp

# 4. Upload your code (replace with your method)
# scp -r /path/to/ChatApp/* user@server:/var/www/chatapp/

# 5. Setup backend
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 6. Setup frontend
cd ../frontend
npm install
npm run build

# 7. Configure Nginx
sudo nano /etc/nginx/sites-available/chatapp
# (Add the nginx configuration above)

# 8. Enable site
sudo ln -s /etc/nginx/sites-available/chatapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 9. Start applications
cd ../backend
pm2 start ecosystem.config.js
cd ../frontend
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 10. Setup SSL
sudo certbot --nginx -d chatapp.tripstarsholidays.com

# 11. Configure firewall
sudo ufw allow 22,80,443/tcp
sudo ufw enable
```

## Final Checklist

- [ ] Domain points to server IP
- [ ] All services running (MongoDB, Nginx, PM2)
- [ ] SSL certificate installed
- [ ] Applications accessible via HTTPS
- [ ] WebSocket connections working
- [ ] Database authentication configured
- [ ] Backup strategy in place
- [ ] Monitoring setup

Your ChatApp should now be live at `https://chatapp.tripstarsholidays.com`!
