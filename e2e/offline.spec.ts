import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const TABLE = '你好\tni3 hao3\tпривет\n谢谢\txie4xie5\tспасибо';

async function serviceWorkerActive(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const reg = await navigator.serviceWorker.getRegistration();
          return reg?.active?.state ?? null;
        }),
      { timeout: 30_000 },
    )
    .toBe('activated');
}

test('service worker берёт управление с первой же загрузки', async ({ page }) => {
  await page.goto('/');
  await serviceWorkerActive(page);

  // Без перезагрузки: преподаватель может открыть приложение впервые прямо
  // в классе, и сеть может пропасть до того, как вкладка откроется снова.
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null), {
      timeout: 15_000,
    })
    .toContain('sw.js');
});

test('приложение открывается без сети', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerActive(page);

  // Первая загрузка идёт до появления SW и им не управляется:
  // контроль берётся со следующей навигации.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null), {
      timeout: 15_000,
    })
    .toContain('sw.js');

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Вставьте таблицу со словами' })).toBeVisible();

    await page.getByLabel('Таблица со словами').fill(TABLE);
    await expect(page.getByText('Добавлено 2 карточки')).toBeVisible();
    await expect(page.getByText('nǐ hǎo')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
