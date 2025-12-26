module.exports = {
  apps: [
    {
      name: 'doodles-server',
      cwd: './server',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      log_file: './logs/server.log',
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      time: true
    },
    {
      name: 'doodles-client',
      cwd: './client',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development'
      },
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      log_file: './logs/client.log',
      error_file: './logs/client-error.log',
      out_file: './logs/client-out.log',
      time: true
    }
  ]
};