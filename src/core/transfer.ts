import { newId } from '@/core/id';
import { uniqueName } from '@/core/library';
import type { Deck } from '@/core/library';
import { STORAGE_VERSION, parseDeckList, sessionFitsDeck } from '@/core/storage';

export type ImportResult = { ok: true; decks: Deck[] } | { ok: false; error: string };

const HEADER = 'иероглиф\tпиньинь\tперевод';

/** Запрещённые в именах файлов символы плюс управляющие. */
// eslint-disable-next-line no-control-regex -- управляющие символы запрещены в именах файлов намеренно.
const UNSAFE_IN_FILE_NAME = /[/\\:*?"<>|\x00-\x1f]/g;

export function exportLibraryJson(decks: readonly Deck[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, decks }, null, 2);
}

export function parseLibraryJson(raw: string): ImportResult {
  // Форма проверяется строго, ссылки сессий — нет: битую сессию сбрасывает
  // mergeImportedDecks, оставляя колоду. Проверь их здесь, файл с одной
  // битой сессией был бы отвергнут целиком, чего спека не хочет.
  const decks = parseDeckList(raw);
  if (decks === null) {
    const otherVersion = mismatchedVersion(raw);
    // Библиотека другой версии — не то же самое, что «не библиотека вовсе»:
    // когда появится v4, это сообщение не должно отправлять искать поломку не там.
    if (otherVersion !== null) {
      return {
        ok: false,
        error: `Файл сохранён другой версией библиотеки (${otherVersion} вместо ${STORAGE_VERSION})`,
      };
    }
    return { ok: false, error: 'Файл не похож на сохранённую библиотеку' };
  }
  return { ok: true, decks };
}

/** Номер версии из файла, если это вообще JSON-объект и версия — не текущая. */
function mismatchedVersion(raw: string): number | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const version = (parsed as { version?: unknown }).version;
  return typeof version === 'number' && version !== STORAGE_VERSION ? version : null;
}

/**
 * Загруженные колоды добавляются к существующим и никогда их не заменяют:
 * повторная загрузка того же файла даёт второй комплект, а не тихую подмену.
 */
export function mergeImportedDecks(existing: readonly Deck[], incoming: readonly Deck[]): Deck[] {
  const result = [...existing];

  for (const deck of incoming) {
    const takenId = result.some((current) => current.id === deck.id);
    result.push({
      ...deck,
      id: takenId ? newId() : deck.id,
      name: uniqueName(result, deck.name),
      session: keepSessionIfWhole(deck),
    });
  }
  return result;
}

/**
 * Файл приходит от пользователя, и терять из-за одной битой сессии всю колоду
 * неправильно: сбрасывается только сессия. Хранилище в том же случае отвергает
 * состояние целиком — там источник свой, и битая ссылка означает поломку.
 */
function keepSessionIfWhole(deck: Deck): Deck['session'] {
  return sessionFitsDeck(deck) ? deck.session : null;
}

export function exportDeckTable(deck: Deck): string {
  const rows = deck.cards.map((card) =>
    [card.hanzi, card.pinyin, card.translation].map(flatten).join('\t'),
  );
  return [HEADER, ...rows].join('\n');
}

/** Табуляция и перевод строки внутри поля разорвали бы строку таблицы. */
function flatten(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ');
}

// Локальная дата, а не UTC (как даёт toISOString): иначе после 21 часа по
// Москве имя файла называло бы вчерашний день.
export function libraryFileName(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `hanzi-cards-${year}-${month}-${day}.json`;
}

export function deckFileName(deck: Deck): string {
  const safe = deck.name.replace(UNSAFE_IN_FILE_NAME, '-').trim();
  // Имя из одних запрещённых символов даёт после замены одни дефисы — за
  // вычетом их ничего не остаётся, и такое имя не годится для файла.
  const meaningful = safe.replace(/-/g, '').trim();
  return `${meaningful === '' ? 'deck' : safe}.tsv`;
}
