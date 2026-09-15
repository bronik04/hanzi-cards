import { DIRECTIONS } from '@/core/deck';
import type { Card, Direction } from '@/core/deck';
import { createDeck, suggestedName } from '@/core/library';
import type { Deck } from '@/core/library';
import type { Session, SessionMode, Stats } from '@/core/session';

export const STORAGE_KEY = 'flashcards.v3';
export const STORAGE_VERSION = 3;

/** Формат Этапа 0. Читается один раз при переносе и никогда не изменяется. */
export const LEGACY_STORAGE_KEY = 'flashcards.v2';

export type StoredState = {
  version: typeof STORAGE_VERSION;
  decks: Deck[];
  activeDeckId: string | null;
};

/**
 * Чем кончилась попытка прочитать хранилище. `empty` и `unreadable` разделены
 * намеренно: поверх пустого хранилища пишут сразу, а нечитаемое значение —
 * единственная копия библиотеки, и запись поверх него уничтожает её.
 */
export type LoadOutcome =
  | { status: 'restored'; state: StoredState }
  | { status: 'empty' }
  | { status: 'unreadable' };

/** Минимальный контракт хранилища. localStorage ему удовлетворяет. */
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function deserialize(raw: string | null): StoredState | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isStoredState(parsed) ? parsed : null;
}

/** Единственная колода Этапа 0 становится первой колодой библиотеки. */
export function migrateFromV2(raw: string | null, now: Date): StoredState | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== 2) return null;
  if (!Array.isArray(parsed.cards) || !parsed.cards.every(isCard)) return null;
  if (typeof parsed.direction !== 'string' || !DIRECTIONS.includes(parsed.direction as Direction)) {
    return null;
  }
  if (!isStats(parsed.stats)) return null;
  if (parsed.session !== null && !isSession(parsed.session)) return null;

  const deck: Deck = {
    ...createDeck(suggestedName(now), parsed.cards, now),
    direction: parsed.direction as Direction,
    session: parsed.session as Session | null,
    stats: parsed.stats,
    startedMode: parsed.startedMode === 'ring' ? 'ring' : 'simple',
  };
  // Прогоняем собранную колоду через isDeck вместо повторной ручной проверки
  // ссылок сессии на карточки: это то же правило, которое Этап 0 применял к
  // v2 напрямую, и оно не должно расходиться с проверкой v3 в isStoredState.
  return isDeck(deck) ? { version: STORAGE_VERSION, decks: [deck], activeDeckId: deck.id } : null;
}

export function loadState(storage: StorageLike, now: Date): LoadOutcome {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const current = deserialize(raw);
      // Ключ на месте, но не читается. Перенос из v2 здесь запрещён: колода
      // Этапа 0 молча стала бы всей библиотекой и легла бы поверх v3.
      return current === null ? { status: 'unreadable' } : { status: 'restored', state: current };
    }
    const migrated = migrateFromV2(storage.getItem(LEGACY_STORAGE_KEY), now);
    return migrated === null ? { status: 'empty' } : { status: 'restored', state: migrated };
  } catch {
    // Хранилище недоступно целиком: спасать нечего, и о записи скажет saveState.
    return { status: 'empty' };
  }
}

/** Возвращает false, если записать не удалось: приватный режим или переполнение квоты. */
export function saveState(storage: StorageLike, state: StoredState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isCard(value: unknown): value is Card {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.hanzi === 'string' &&
    typeof value.pinyin === 'string' &&
    typeof value.translation === 'string'
  );
}

function isSession(value: unknown): value is Session {
  if (!isRecord(value) || typeof value.finished !== 'boolean') return false;

  // Номера считают штуки, поэтому Number.isInteger, а не typeof: JSON.parse
  // отдаёт 1e999 как Infinity, а JSON.stringify пишет его обратно как null —
  // такое состояние сохраняется и на следующем чтении отвергается целиком.
  if (value.mode === 'simple') {
    return (
      Number.isInteger(value.round) &&
      isStringArray(value.queue) &&
      isStringArray(value.nextRound) &&
      typeof value.perfectRound === 'boolean' &&
      typeof value.finalRound === 'boolean'
    );
  }
  if (value.mode === 'ring') {
    return (
      Number.isInteger(value.blockIndex) &&
      Array.isArray(value.blocks) &&
      value.blocks.every(isStringArray) &&
      isStringArray(value.queue)
    );
  }
  return false;
}

function isStats(value: unknown): value is Stats {
  // Number.isFinite отсекает Infinity и NaN: они проходят typeof 'number',
  // но переживают JSON-цикл как null и рушат следующее чтение.
  return isRecord(value) && Number.isFinite(value.known) && Number.isFinite(value.unknown);
}

function isMode(value: unknown): value is SessionMode {
  return value === 'simple' || value === 'ring';
}

/** Идентификаторы карточек, на которые ссылается сессия. */
export function sessionCardIds(session: Session): string[] {
  return session.mode === 'ring'
    ? [...session.queue, ...session.blocks.flat()]
    : [...session.queue, ...session.nextRound];
}

/** Форма колоды, без проверки ссылок сессии. */
function isDeckShape(value: unknown): value is Deck {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.lastOpenedAt !== 'string' ||
    !Array.isArray(value.cards) ||
    !value.cards.every(isCard) ||
    typeof value.direction !== 'string' ||
    !DIRECTIONS.includes(value.direction as Direction) ||
    !isStats(value.stats) ||
    !isMode(value.startedMode)
  ) {
    return false;
  }
  return value.session === null || isSession(value.session);
}

/** Сессия ссылается только на карточки своей колоды. */
export function sessionFitsDeck(deck: Deck): boolean {
  if (deck.session === null) return true;
  const known = new Set(deck.cards.map((card) => card.id));
  return sessionCardIds(deck.session).every((id) => known.has(id));
}

function isDeck(value: unknown): value is Deck {
  // Сессия, ссылающаяся на отсутствующую карточку, даёт экран тренировки без
  // карточки и без единой кнопки. В хранилище такое состояние отвергается
  // целиком; файл обмена мягче — там сбрасывается только сессия.
  return isDeckShape(value) && sessionFitsDeck(value);
}

/**
 * Список колод из файла обмена: форма проверяется, ссылки сессий — нет.
 * Их чинит `mergeImportedDecks`, сбрасывая только битую сессию.
 */
export function parseDeckList(raw: string): Deck[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return null;
  if (!Array.isArray(parsed.decks) || !parsed.decks.every(isDeckShape)) return null;
  return parsed.decks;
}

function isStoredState(value: unknown): value is StoredState {
  if (
    !isRecord(value) ||
    value.version !== STORAGE_VERSION ||
    !Array.isArray(value.decks) ||
    !value.decks.every(isDeck)
  ) {
    return false;
  }
  if (value.activeDeckId === null) return true;
  if (typeof value.activeDeckId !== 'string') return false;
  return value.decks.some((deck) => deck.id === value.activeDeckId);
}
