import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 1 : 0,
  // Дефолтный репортёр Playwright не пишет playwright-report/, и шаг
  // upload-artifact в CI прикладывал пустоту. Падение в CI надо чинить по
  // отчёту: локально этот прогон может и не воспроизвестись.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },
  // Тест идёт по собранному приложению: только так проверяются пути и service worker.
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120_000,
  },
});
