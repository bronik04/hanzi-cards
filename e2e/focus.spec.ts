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

// Отрицательная проверка отложена из задачи 1: там на первом экране не было
// элемента, который фокусируется, оставаясь на месте. Радиокнопка выбора
// колонок подходит — она никуда не уводит и фокус у себя удерживает.
//
// Escape для этого не годится: нажатие клавиши переводит браузер в
// клавиатурный режим, и кольцо после него показывается заслуженно.
test('клик мышью кольцо не зажигает, а Tab зажигает', async ({ page }) => {
  await page.goto('/');

  const radio = page.getByRole('radio', { name: 'Иероглиф + перевод' });
  await radio.click();

  await expect(radio).toBeFocused();
  expect(await radio.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');

  // Тот же элемент, дофокушенный с клавиатуры, кольцо получает.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  expect(await radio.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(
    'rgba(66, 85, 255',
  );
});

test('после перехода фокус на заголовке нового экрана', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'В библиотеку' }).click();

  await expect(page.getByRole('heading', { name: 'Мои колоды' })).toBeVisible();
  const focused = await page.evaluate(() => document.activeElement?.tagName ?? '');
  expect(focused).toBe('H1');
});
