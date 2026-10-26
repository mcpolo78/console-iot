import { defineConfig } from '@playwright/test';

// Parcours de bout en bout : API (port 4000) + front (port 3000) déjà compilés,
// sur une base migrée et seedée (DATABASE_URL)
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'npm run start -w api',
      url: 'http://localhost:4000/health',
      env: { PORT: '4000', WEB_ORIGIN: 'http://localhost:3000' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run start -w web',
      url: 'http://localhost:3000/login',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
