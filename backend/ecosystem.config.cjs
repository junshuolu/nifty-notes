module.exports = {
  apps: [
    {
      name: 'nifty-notes',
      cwd: __dirname,
      script: 'server.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        HOST: '0.0.0.0',
        INTERNAL_HOST: '127.0.0.1',
        PORT: '3001',
        // If Chrome/Chromium is installed in a non-standard location, uncomment and set it.
        // CHROME_EXECUTABLE_PATH: '/usr/bin/chromium-browser',
      },
    },
  ],
}
