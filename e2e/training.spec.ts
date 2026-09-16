import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TABLE, WORDS } from './fixtures';

// Восемь карточек — это блок из семи плюс короткий блок из одной,
// то есть проверяются и переход между блоками, и неполный последний блок.
const TOTAL = WORDS.length * 2;

test('режим колец проходится до экрана итогов', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Таблица со словами').fill(TABLE);
  await expect(page.getByText('Добавлено 8 карточек')).toBeVisible();

  await page.getByRole('button', { name: 'Создать колоду' }).click();
  await expect(page.getByRole('heading', { name: 'Колода готова: 8 карточек' })).toBeVisible();

  await page.getByRole('button', { name: /^Кольца по 7/ }).click();
  await expect(page.getByText('Блок 1 из 2 · осталось 7')).toBeVisible();

  const know = page.getByRole('button', { name: 'Знаю' });
  for (let done = 1; done < TOTAL; done += 1) {
    await know.click();
    // Ждём счётчик, а не таймер: так тест не зависит от длительности анимации.
    await expect(page.getByTestId('count-known')).toHaveText(`✓ ${done}`);
  }
  await know.click();

  await expect(page.getByRole('heading', { name: 'Готово' })).toBeVisible();
  await expect(page.getByText('Знаю: 16 · Не знаю: 0')).toBeVisible();
});

/** Текст баннера и геометрия — одним чтением страницы. Баннер живёт 1800 мс, и
 *  между двумя round-trip'ами он успел бы погаснуть: замер тогда сошёлся бы сам
 *  собой и тест молча прошёл бы мимо регресса. */
async function trainingLayout(page: Page) {
  return page.evaluate(() => {
    const banner = document.querySelector('[data-testid="stage-banner"]');
    const know = [...document.querySelectorAll('button')].find(
      (node) => node.textContent === 'Знаю',
    );
    if (banner === null || know === undefined) throw new Error('экран тренировки не отрисован');
    return {
      bannerText: banner.textContent ?? '',
      bannerHeight: banner.getBoundingClientRect().height,
      // Координата документа, а не окна: клик прокручивает страницу к кнопке,
      // и y относительно окна менялся бы не из-за вёрстки.
      knowTop: know.getBoundingClientRect().y + window.scrollY,
    };
  });
}

// Баннер о смене блока раньше монтировался в поток и сдвигал карточку с кнопками
// на строку вниз, так что клик в «Знаю» попадал в «Показать ответ». Проверка
// живёт в e2e: в jsdom нет раскладки, и юнит-тест такое поймать не может.
test('смена блока не сдвигает кнопки', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Таблица со словами').fill(TABLE);
  await page.getByRole('button', { name: 'Создать колоду' }).click();
  await page.getByRole('button', { name: /^Кольца по 7/ }).click();
  await expect(page.getByText('Блок 1 из 2 · осталось 7')).toBeVisible();

  const know = page.getByRole('button', { name: 'Знаю' });
  const before = await trainingLayout(page);

  // Пустой слот держит высоту строки: иначе появление текста раздвинет колонку.
  expect(before.bannerText).toBe('');
  expect(before.bannerHeight).toBeGreaterThan(0);

  // Семь карточек первого блока — после последней начинается блок 2.
  for (let done = 1; done <= 7; done += 1) {
    await know.click();
    await expect(page.getByTestId('count-known')).toHaveText(`✓ ${done}`);
  }
  await expect(page.getByTestId('stage-banner')).toHaveText('Блок 2 из 2');

  const during = await trainingLayout(page);
  // Баннер ещё на экране — иначе сравнение ниже сошлось бы само собой.
  expect(during.bannerText).toBe('Блок 2 из 2');
  // Высота слота не зависит от наличия текста, а кнопка не сдвинулась.
  expect(during.bannerHeight).toBe(before.bannerHeight);
  expect(during.knowTop).toBeCloseTo(before.knowTop, 0);
});

test('пиньинь показан с диакритикой', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Таблица со словами').fill(TABLE);
  await expect(page.getByText('nǐ hǎo')).toBeVisible();
});

test('service worker собран и откладывает обновление до кнопки', async ({ request }) => {
  const response = await request.get('/sw.js');
  expect(response.status()).toBe(200);

  // registerType: 'prompt' — новая версия активируется только по сообщению
  // SKIP_WAITING, которое шлёт кнопка «Обновить». Переключение на autoUpdate
  // убрало бы этот обмен и начало бы перезагружать страницу посреди урока.
  expect(await response.text()).toContain('SKIP_WAITING');
});
