import { expect, test } from '@playwright/test';
import { SHORT_TABLE, serviceWorkerActive, serviceWorkerControlling } from './fixtures';

// Проверка идёт с первого визита, без промежуточной перезагрузки: преподаватель
// может открыть приложение впервые прямо в классе и потерять сеть до того, как
// вкладка откроется снова. Перезагрузка здесь замаскировала бы регресс
// clientsClaim — тест проходил бы и без него.
test('приложение работает без сети с первого визита', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerActive(page);
  await serviceWorkerControlling(page);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Новая колода' })).toBeVisible();
  await page.getByLabel('Таблица со словами').fill(SHORT_TABLE);
  await expect(page.getByText('Добавлено 2 карточки')).toBeVisible();
  await expect(page.getByText('nǐ hǎo')).toBeVisible();
});

// Настоящий сценарий урока: колода загружена дома, в классе сети нет.
test('сохранённая колода и прогресс переживают потерю сети', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerActive(page);
  await serviceWorkerControlling(page);

  await page.getByLabel('Таблица со словами').fill(SHORT_TABLE);
  await page.getByRole('button', { name: 'Создать колоду' }).click();
  await page.getByRole('button', { name: 'Простой просмотр' }).click();
  await page.getByRole('button', { name: 'Знаю' }).click();
  await expect(page.getByTestId('count-known')).toHaveText('1');

  await context.setOffline(true);
  await page.reload();

  // Библиотека — первый экран для непустого списка колод, а не сразу
  // возобновление: до Этапа 1 колода была одна и открывалась сама, теперь
  // возобновление начинается по клику на неё в списке.
  await expect(page.getByRole('heading', { name: 'Мои колоды' })).toBeVisible();
  await page.getByRole('button', { name: /карточк/ }).click();
  await expect(page.getByRole('heading', { name: 'Продолжить тренировку?' })).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByTestId('count-known')).toHaveText('1');
  await expect(page.getByText('谢谢')).toBeVisible();
});
