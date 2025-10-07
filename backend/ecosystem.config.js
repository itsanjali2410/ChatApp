module.exports = {
  apps: [
    {
      name: 'chatapp-backend',
      script: './venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      watch: false,
      interpreter: 'python3',
      env: {
        PORT: 8000,
      },
    },
  ],
};
