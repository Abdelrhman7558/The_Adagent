module.exports = {
  apps: [
    {
      name: "adstartup-agent",
      script: "./dist/index.js",
      instances: process.env.WORKERS || 1,
      exec_mode: "cluster",
      max_memory_restart: "512M",
      env_production: {
        NODE_ENV: "production",
        LOG_LEVEL: "info",
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      autorestart: true,
      watch: false,
    },
  ],
};
