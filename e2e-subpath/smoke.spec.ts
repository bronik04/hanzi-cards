import { expect, test } from '@playwright/test';
import { BASE } from './base';

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
  await expect(page.getByRole('heading', { name: 'Вставьте таблицу со словами' })).toBeVisible();
  expect(failed).toEqual([]);
});
