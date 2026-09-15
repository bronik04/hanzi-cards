import { expect, test } from '@playwright/test';
import { SHORT_TABLE, serviceWorkerActive, serviceWorkerControlling } from '../e2e/fixtures';
import { APP_URL, BASE } from './base';

test('приложение под подпутём грузится без ответов 4xx', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', (response) => {
    // Заодно ловим 5xx: это ничего не стоит.
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });

  const response = await page.goto('./');
  if (response === null) throw new Error('стенд не ответил на запрос страницы');

  // baseURL здесь с путём, и goto('/') ушёл бы в корень домена, а не в
  // подкаталог. vite preview отвечает на корень редиректом 302 на подпуть,
  // так что такая ошибка была бы зелёной и локально, и в CI, — а на Pages
  // в корне домена лежит чужой сайт. Требуем, чтобы захода через корень не было.
  expect(response.request().redirectedFrom()).toBeNull();
  expect(new URL(page.url()).pathname).toBe(BASE);

  // Ждём отрисованный экран, а не событие load: иначе проверка сойдётся
  // раньше, чем приедут ассеты, и пропустит их 404.
  await expect(page.getByRole('heading', { name: 'Новая колода' })).toBeVisible();
  expect(failed).toEqual([]);
});

test('манифест лежит под подпутём и описывает его в start_url и scope', async ({ page }) => {
  await page.goto('./');

  // Атрибут, а не свойство .href: свойство браузер уже разрешил в абсолютный
  // URL, и подмена base читается в нём хуже.
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe(`${BASE}manifest.webmanifest`);

  const response = await page.request.get(`${BASE}manifest.webmanifest`);
  expect(response.status()).toBe(200);

  const manifest = (await response.json()) as { start_url?: string; scope?: string };
  // Неверный start_url — это установленное приложение, которое открывается
  // не туда. На глаз незаметно: первая же навигация выглядит нормально.
  expect(manifest.start_url).toBe(BASE);
  expect(manifest.scope).toBe(BASE);
});

test('service worker зарегистрирован со scope подпути', async ({ page }) => {
  await page.goto('./');
  await serviceWorkerActive(page);

  const registration = await page.evaluate(async () => {
    const current = await navigator.serviceWorker.getRegistration();
    return {
      scope: current?.scope ?? null,
      scriptURL: current?.active?.scriptURL ?? null,
    };
  });

  // Хелпер serviceWorkerControlling проверяет только вхождение 'sw.js', и под
  // корневым base такая проверка тоже зелёная. Здесь нужен полный адрес:
  // именно scope решает, какие навигации service worker вообще перехватывает.
  expect(registration.scope).toBe(APP_URL);
  expect(registration.scriptURL).toBe(`${APP_URL}sw.js`);
});

// Без промежуточной перезагрузки, как и в e2e/offline.spec.ts: она
// замаскировала бы регресс clientsClaim — тест проходил бы и без него.
// Под подпутём проверка стережёт другое: что service worker, зарегистрированный
// по /hanzi-cards/sw.js со scope /hanzi-cards/, действительно перехватывает
// навигацию и отдаёт приложение из кеша. Это ловит абсолютный navigateFallback
// ('/index.html' вместо относительного) и абсолютный scope в регистрации.
test('приложение под подпутём работает без сети с первого визита', async ({ page, context }) => {
  await page.goto('./');
  await serviceWorkerActive(page);
  await serviceWorkerControlling(page);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Новая колода' })).toBeVisible();
  await page.getByLabel('Таблица со словами').fill(SHORT_TABLE);
  await expect(page.getByText('Добавлено 2 карточки')).toBeVisible();
});
