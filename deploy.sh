#!/bin/bash

# ChatApp Deployment Script for Ubuntu Server
# Run this script on your Ubuntu server

echo "🚀 Starting ChatApp Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.11
print_status "Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-venv python3.11-pip

# Install MongoDB
print_status "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Certbot
print_status "Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

# Start services
print_status "Starting services..."
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl start nginx
sudo systemctl enable nginx

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /var/www/chatapp
sudo chown -R $USER:$USER /var/www/chatapp

# Create log directory
print_status "Creating log directory..."
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

print_status "✅ Basic server setup completed!"
print_warning "Next steps:"
echo "1. Upload your ChatApp code to /var/www/chatapp/"
echo "2. Run the setup script: ./setup-app.sh"
echo "3. Configure your domain: chatapp.tripstarsholidays.com"
echo "4. Run the SSL setup: ./setup-ssl.sh"

# Create setup scripts
cat > setup-app.sh << 'EOF'
#!/bin/bash

echo "🔧 Setting up ChatApp application..."

cd /var/www/chatapp

# Backend setup
print_status "Setting up backend..."
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cat > .env << 'ENVEOF'
SECRET_KEY=your-super-secret-key-change-this-in-production
MONGODB_URL=mongodb://localhost:27017/chatapp
CORS_ORIGINS=https://chatapp.tripstarsholidays.com
ENVEOF

# Frontend setup
print_status "Setting up frontend..."
cd ../frontend
npm install
npm run build

# Create .env.local file
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://chatapp.tripstarsholidays.com/api
NEXT_PUBLIC_WS_URL=wss://chatapp.tripstarsholidays.com
ENVEOF

# Configure Nginx
print_status "Configuring Nginx..."
sudo cp nginx-chatapp.conf /etc/nginx/sites-available/chatapp
sudo ln -s /etc/nginx/sites-available/chatapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Start applications with PM2
print_status "Starting applications..."
cd ../backend
pm2 start ecosystem.config.js
cd ../frontend
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Application setup completed!"
echo "Your app should now be running at http://chatapp.tripstarsholidays.com"
echo "Run ./setup-ssl.sh to enable HTTPS"
EOF

cat > setup-ssl.sh << 'EOF'
#!/bin/bash

echo "🔒 Setting up SSL certificate..."

# Get SSL certificate
sudo certbot --nginx -d chatapp.tripstarsholidays.com

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "✅ SSL setup completed!"
echo "Your app is now available at https://chatapp.tripstarsholidays.com"
EOF

# Make scripts executable
chmod +x setup-app.sh setup-ssl.sh

print_status "🎉 Deployment preparation completed!"
print_status "Run the following commands to complete setup:"
echo "1. ./setup-app.sh"
echo "2. ./setup-ssl.sh"
