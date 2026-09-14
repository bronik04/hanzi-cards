import { defineConfig } from '@playwright/test';
import { APP_URL, BASE, PORT } from './e2e-subpath/base';

// Второй стенд: приложение собрано с тем же base, с которым его отдаёт
// GitHub Pages. От base зависят пути к ассетам, start_url и scope манифеста,
// scope регистрации service worker и список URL в прекеше workbox — всё то,
// что обычный стенд с base '/' не проверяет вовсе.
export default defineConfig({
  testDir: './e2e-subpath',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 1 : 0,
  use: { baseURL: APP_URL },
  webServer: {
    // Свой outDir: обычный стенд собирает в dist/, и запущенный рядом
    // `npm run preview` иначе начал бы молча отдавать файлы с чужим base.
    // vite build напрямую, а не npm run build: последний добавляет
    // tsc --noEmit, который в CI уже отработал в джобе check.
    command: `vite build --outDir dist-subpath && vite preview --outDir dist-subpath --port ${PORT}`,
    // Переменная живёт здесь, а не в npm-скрипте: скрипт без неё собрал бы
    // корневой base в подпутевую папку и врал бы собственному имени.
    env: { DEPLOY_BASE: BASE },
    url: APP_URL,
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120_000,
  },
});
