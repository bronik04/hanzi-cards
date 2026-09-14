import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const WORDS = [
  ['你好', 'ni3 hao3', 'привет'],
  ['谢谢', 'xie4xie5', 'спасибо'],
  ['再见', 'zai4jian4', 'до свидания'],
  ['老师', 'lao3shi1', 'учитель'],
  ['学生', 'xue2sheng5', 'ученик'],
  ['中国', 'zhong1guo2', 'Китай'],
  ['学习', 'xue2xi2', 'учиться'],
  ['汉语', 'han4yu3', 'китайский язык'],
];
const TABLE = WORDS.map((row) => row.join('\t')).join('\n');

// Восемь карточек — это блок из семи плюс короткий блок из одной,
// то есть проверяются и переход между блоками, и неполный последний блок.
const TOTAL = WORDS.length * 2;

test('режим колец проходится до экрана итогов', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Таблица со словами').fill(TABLE);
  await expect(page.getByText('Добавлено 8 карточек')).toBeVisible();

  await page.getByRole('button', { name: 'Создать колоду' }).click();
  await expect(page.getByRole('heading', { name: 'Колода готова: 8 карточек' })).toBeVisible();

  await page.getByRole('button', { name: 'Заучивание кольцами по 7' }).click();
  await expect(page.getByText('Блок 1 из 2 · осталось 7')).toBeVisible();

  const know = page.getByRole('button', { name: 'Знаю' });
  for (let done = 1; done < TOTAL; done += 1) {
    await know.click();
    // Ждём счётчик, а не таймер: так тест не зависит от длительности анимации.
    await expect(page.getByTestId('count-known')).toHaveText(String(done));
  }
  await know.click();

  await expect(page.getByRole('heading', { name: 'Готово' })).toBeVisible();
  await expect(page.getByText('Знаю: 16 · Не знаю: 0')).toBeVisible();
});

/** Прямоугольник элемента. Отдельной функцией, чтобы `null` от невидимого
 *  элемента падал внятным сообщением, а не сравнением с undefined. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('элемент не занимает места на странице');
  return box;
}

// Баннер о смене блока раньше монтировался в поток и сдвигал карточку с кнопками
// на строку вниз, так что клик в «Знаю» попадал в «Показать ответ». Проверка
// живёт в e2e: в jsdom нет раскладки, и юнит-тест такое поймать не может.
test('смена блока не сдвигает кнопки', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Таблица со словами').fill(TABLE);
  await page.getByRole('button', { name: 'Создать колоду' }).click();
  await page.getByRole('button', { name: 'Заучивание кольцами по 7' }).click();
  await expect(page.getByText('Блок 1 из 2 · осталось 7')).toBeVisible();

  const banner = page.getByTestId('stage-banner');
  const know = page.getByRole('button', { name: 'Знаю' });

  // Пустой слот держит высоту строки: иначе появление текста раздвинет колонку.
  await expect(banner).toBeEmpty();
  expect((await boxOf(banner)).height).toBeGreaterThan(0);

  const before = (await boxOf(know)).y;

  // Семь карточек первого блока — после последней начинается блок 2.
  for (let done = 1; done <= 7; done += 1) {
    await know.click();
    await expect(page.getByTestId('count-known')).toHaveText(String(done));
  }

  // Баннер виден 1800 мс; позиция кнопки меряется, пока он на экране.
  await expect(banner).toHaveText('Блок 2 из 2');
  expect((await boxOf(know)).y).toBeCloseTo(before, 0);
});

test('пиньинь показан с диакритикой', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Таблица со словами').fill(TABLE);
  await expect(page.getByText('nǐ hǎo')).toBeVisible();
});

test('service worker собран и отдаётся', async ({ request }) => {
  const response = await request.get('/sw.js');
  expect(response.status()).toBe(200);
});
