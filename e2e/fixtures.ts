import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const WORDS = [
  ['你好', 'ni3 hao3', 'привет'],
  ['谢谢', 'xie4xie5', 'спасибо'],
  ['再见', 'zai4jian4', 'до свидания'],
  ['老师', 'lao3shi1', 'учитель'],
  ['学生', 'xue2sheng5', 'ученик'],
  ['中国', 'zhong1guo2', 'Китай'],
  ['学习', 'xue2xi2', 'учиться'],
  ['汉语', 'han4yu3', 'китайский язык'],
];

const asTable = (rows: string[][]) => rows.map((row) => row.join('\t')).join('\n');

/** Восемь карточек: блок из семи плюс короткий блок из одной. */
export const TABLE = asTable(WORDS);

/** Две карточки — когда проверяется не логика блоков, а что-то другое. */
export const SHORT_TABLE = asTable(WORDS.slice(0, 2));

/** Проходит экран импорта целиком: имя, таблица, создание колоды. */
export async function createDeckThroughUi(page: Page, name: string, table: string) {
  const nameField = page.getByLabel('Название колоды');
  await nameField.fill(name);
  await page.getByLabel('Таблица со словами').fill(table);
  await page.getByRole('button', { name: 'Создать колоду' }).click();
  await expect(page.getByRole('heading', { name: /Колода готова/ })).toBeVisible();
}

export async function serviceWorkerActive(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration?.active?.state ?? null;
        }),
      { timeout: 15_000 },
    )
    .toBe('activated');
}

export async function serviceWorkerControlling(page: Page) {
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null), {
      timeout: 10_000,
    })
    .toContain('sw.js');
}
