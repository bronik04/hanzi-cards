import { expect, test } from '@playwright/test';

// Кольцо фокуса проверяется в настоящем браузере: jsdom не считает каскад,
// и в модульном тесте вычисленного box-shadow просто нет.
//
// Свежий контекст приходит на экран импорта, а не в библиотеку: при пустой
// библиотеке гидратация выбирает импорт (см. appReducer, случай restore).

test('кнопка получает видимое кольцо фокуса с клавиатуры', async ({ page }) => {
  await page.goto('/');

  const toLibrary = page.getByRole('button', { name: 'В библиотеку' });
  await toLibrary.focus();

  const shadow = await toLibrary.evaluate((el) => getComputedStyle(el).boxShadow);
  // Кольцо задано через box-shadow, а не outline: outline не скругляется
  // по border-radius в части браузеров.
  expect(shadow).not.toBe('none');
  expect(shadow).toContain('rgba(66, 85, 255');
});

test('кольцо доезжает и до поля ввода', async ({ page }) => {
  await page.goto('/');

  const table = page.getByLabel('Таблица со словами');
  await table.focus();

  const shadow = await table.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toContain('rgba(66, 85, 255');
});
