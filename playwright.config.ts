import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 1 : 0,
  use: { baseURL: 'http://localhost:4173' },
  // Тест идёт по собранному приложению: только так проверяются пути и service worker.
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120_000,
  },
});
