module.exports = {
  apps: [
    {
      name: "basketball-webapp",
      cwd: "/root/basketball_webapp",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "80",
        COOKIE_SECURE: "false",
        AUTH_SECRET: process.env.AUTH_SECRET,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
