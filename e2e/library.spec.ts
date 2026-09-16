import { expect, test } from '@playwright/test';
import { SHORT_TABLE, TABLE, createDeckThroughUi } from './fixtures';

test('две колоды не мешают тренировкам друг друга', async ({ page }) => {
  await page.goto('/');

  await createDeckThroughUi(page, 'Юнит 1', TABLE);
  await page.getByRole('button', { name: /^Просмотр/ }).click();
  await page.getByRole('button', { name: 'Знаю' }).click();
  await expect(page.getByTestId('count-known')).toHaveText('1');

  // «Закрыть тренировку» → «Выйти» — это явный отказ от сессии (см.
  // TrainingScreen: предупреждение «Прогресс тренировки будет потерян» не
  // просто текст, go-to-mode действительно обнуляет session). Здесь же
  // проверяется обратное — что колода помнит прогресс, — поэтому уходим
  // прямой ссылкой «В библиотеку»: она не трогает активную колоду.
  await page.getByRole('button', { name: 'В библиотеку' }).click();
  await page.getByRole('button', { name: 'Добавить колоду' }).click();
  await createDeckThroughUi(page, 'Юнит 2', SHORT_TABLE);
  await expect(page.getByRole('heading', { name: 'Колода готова: 2 карточки' })).toBeVisible();

  // Первая колода должна помнить, что тренировка не закончена.
  await page.getByRole('button', { name: 'В библиотеку' }).click();
  await expect(page.getByRole('button', { name: /^Юнит 1/ })).toContainText(
    'тренировка не закончена',
  );
  await expect(page.getByRole('button', { name: /^Юнит 2/ })).not.toContainText(
    'тренировка не закончена',
  );

  // И действительно продолжает с того же места.
  await page.getByRole('button', { name: /^Юнит 1/ }).click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByTestId('count-known')).toHaveText('1');
});

test('переименование и удаление колоды', async ({ page }) => {
  await page.goto('/');
  await createDeckThroughUi(page, 'Юнит 1', SHORT_TABLE);
  await page.getByRole('button', { name: 'В библиотеку' }).click();

  await page.getByRole('button', { name: 'Действия с колодой «Юнит 1»' }).click();
  await page.getByRole('menuitem', { name: 'Переименовать' }).click();
  await page.getByLabel('Название колоды').fill('Переименованная');
  // exact: true — иначе имя совпадёт заодно с «Сохранить в файл» библиотеки:
  // без якоря на конец строки это тоже подстрока с «Сохранить».
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Переименованная/ })).toBeVisible();

  await page.getByRole('button', { name: 'Действия с колодой «Переименованная»' }).click();
  await page.getByRole('menuitem', { name: 'Удалить' }).click();
  await expect(page.getByText('Удалить вместе с прогрессом?')).toBeVisible();
  await page.getByRole('button', { name: /^Удалить/ }).click();
  await expect(page.getByText('Пока ни одной колоды', { exact: false })).toBeVisible();
});

test('библиотека сохраняется в файл и загружается обратно', async ({ page }) => {
  await page.goto('/');
  await createDeckThroughUi(page, 'Юнит 1', SHORT_TABLE);
  await page.getByRole('button', { name: 'В библиотеку' }).click();

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Сохранить в файл' }).click(),
  ]).then(([event]) => event);

  const path = await download.path();
  expect(path).not.toBeNull();

  // Загрузка добавляет колоды, а не заменяет: в списке станет две.
  await page.getByRole('button', { name: 'Загрузить из файла' }).click();
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(path as string);

  await expect(page.getByRole('button', { name: /^Юнит 1/ })).toHaveCount(2);
  await expect(page.getByRole('button', { name: /^Юнит 1 \(2\)/ })).toBeVisible();
});
