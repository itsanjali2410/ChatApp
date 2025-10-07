module.exports = {
  apps: [{
    name: 'chatapp-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/Tripstars/chatapp/frontend',
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
