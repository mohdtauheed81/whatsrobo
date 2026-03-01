module.exports = {
  apps: [
    {
      name: 'whatsapp-api',
      script: './src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'whatsapp-worker',
      script: './src/services/worker/MessageWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'usage-reset-job',
      script: './src/jobs/usageResetJob.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 0 1 * *',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/job-error.log',
      out_file: './logs/job-out.log'
    }
  ]
};
