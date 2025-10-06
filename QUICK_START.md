# 🚀 Quick Start - Deploy ChatApp to Ubuntu Server

## Prerequisites
- Ubuntu server with sudo access
- Domain `chatapp.tripstarsholidays.com` pointing to your server IP
- Your ChatApp code ready

## Step 1: Upload Files to Server

### Option A: Using SCP (from your local machine)
```bash
# Upload the entire ChatApp folder
scp -r /path/to/your/ChatApp/* user@your-server-ip:/var/www/chatapp/
```

### Option B: Using Git (if you have a repository)
```bash
# On your server
cd /var/www/chatapp
git clone https://github.com/yourusername/chatapp.git .
```

## Step 2: Run Deployment Script

### On your Ubuntu server:
```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

This will install:
- ✅ Node.js 18.x
- ✅ Python 3.11
- ✅ MongoDB
- ✅ Nginx
- ✅ PM2
- ✅ Certbot (for SSL)

## Step 3: Setup Application

```bash
# Run the application setup
./setup-app.sh
```

This will:
- ✅ Install backend dependencies
- ✅ Build frontend
- ✅ Configure Nginx
- ✅ Start applications with PM2

## Step 4: Enable HTTPS

```bash
# Setup SSL certificate
./setup-ssl.sh
```

This will:
- ✅ Get SSL certificate from Let's Encrypt
- ✅ Configure HTTPS
- ✅ Setup auto-renewal
- ✅ Configure firewall

## Step 5: Verify Deployment

Visit: `https://chatapp.tripstarsholidays.com`

## Troubleshooting

### Check if services are running:
```bash
# Check PM2 processes
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check MongoDB
sudo systemctl status mongod

# Check logs
pm2 logs
```

### Common fixes:
```bash
# Restart services
pm2 restart all
sudo systemctl restart nginx

# Check Nginx config
sudo nginx -t

# Check firewall
sudo ufw status
```

## File Structure After Deployment

```
/var/www/chatapp/
├── backend/
│   ├── venv/                 # Python virtual environment
│   ├── .env                  # Backend environment variables
│   └── ecosystem.config.js   # PM2 configuration
├── frontend/
│   ├── .next/               # Next.js build output
│   ├── .env.local           # Frontend environment variables
│   └── ecosystem.config.js  # PM2 configuration
├── deploy.sh                # Main deployment script
├── setup-app.sh            # Application setup script
└── setup-ssl.sh            # SSL setup script
```

## Environment Variables

### Backend (.env):
```env
SECRET_KEY=your-super-secret-key-change-this-in-production
MONGODB_URL=mongodb://localhost:27017/chatapp
CORS_ORIGINS=https://chatapp.tripstarsholidays.com
```

### Frontend (.env.local):
```env
NEXT_PUBLIC_API_URL=https://chatapp.tripstarsholidays.com/api
NEXT_PUBLIC_WS_URL=wss://chatapp.tripstarsholidays.com
```

## Monitoring Commands

```bash
# View all processes
pm2 status

# View logs
pm2 logs

# Restart application
pm2 restart chatapp-backend
pm2 restart chatapp-frontend

# Monitor resources
pm2 monit
```

## Backup Commands

```bash
# Backup database
mongodump --db chatapp --out /var/backups/mongodb/backup_$(date +%Y%m%d)

# Backup application files
tar -czf /var/backups/chatapp_$(date +%Y%m%d).tar.gz /var/www/chatapp/
```

## Security Checklist

- [ ] Change default MongoDB password
- [ ] Update SECRET_KEY in .env
- [ ] Configure firewall (ports 22, 80, 443 only)
- [ ] Setup regular backups
- [ ] Monitor logs regularly
- [ ] Keep system updated

## Support

If you encounter issues:
1. Check the logs: `pm2 logs`
2. Verify services: `pm2 status`
3. Test Nginx: `sudo nginx -t`
4. Check firewall: `sudo ufw status`

Your ChatApp should now be live at `https://chatapp.tripstarsholidays.com`! 🎉
