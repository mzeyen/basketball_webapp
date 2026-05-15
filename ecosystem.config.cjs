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
        APP_URL: process.env.APP_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        EMAIL_FROM: process.env.EMAIL_FROM,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        AUTH_SECRET: process.env.AUTH_SECRET,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
