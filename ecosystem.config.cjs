// PM2 process manager config — `pm2 start ecosystem.config.cjs`
// ใช้บน VPS/Linux หรือ Windows Server ที่ติดตั้ง PM2 ไว้
module.exports = {
  apps: [
    {
      name: 'promptroom',
      cwd: __dirname,
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
        HOST: '0.0.0.0',
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 200,
      kill_timeout: 8000,
      out_file: './data/logs/promptroom.out.log',
      error_file: './data/logs/promptroom.err.log',
      merge_logs: true,
      time: true,
    },
  ],
}
