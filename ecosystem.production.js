module.exports = {
  apps: [
    {
      name: 'doodles-server',
      cwd: './server',
      script: 'index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      log_file: './logs/server.log',
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      time: true,
      // Auto restart if crashes
      autorestart: true,
      // Max restarts within 1 minute
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};