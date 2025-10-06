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
