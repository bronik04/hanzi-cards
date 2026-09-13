import { DIRECTIONS } from '@/core/deck';
import type { Card, Direction } from '@/core/deck';
import type { Session, SessionMode } from '@/core/session';

export const STORAGE_KEY = 'flashcards.v2';
export const STORAGE_VERSION = 2;

export type Stats = { known: number; unknown: number };

export type StoredState = {
  version: typeof STORAGE_VERSION;
  cards: Card[];
  direction: Direction;
  session: Session | null;
  stats: Stats;
  /** Режим, которым сессия была запущена. Необязателен: состояния, записанные
   *  до появления поля, должны оставаться читаемыми. */
  startedMode?: SessionMode;
};

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

export function loadState(storage: StorageLike): StoredState | null {
  try {
    return deserialize(storage.getItem(STORAGE_KEY));
  } catch {
    return null;
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

  if (value.mode === 'simple') {
    return (
      typeof value.round === 'number' &&
      isStringArray(value.queue) &&
      isStringArray(value.nextRound) &&
      typeof value.perfectRound === 'boolean' &&
      typeof value.finalRound === 'boolean'
    );
  }
  if (value.mode === 'ring') {
    return (
      typeof value.blockIndex === 'number' &&
      Array.isArray(value.blocks) &&
      value.blocks.every(isStringArray) &&
      isStringArray(value.queue)
    );
  }
  return false;
}

function isStats(value: unknown): value is Stats {
  return isRecord(value) && typeof value.known === 'number' && typeof value.unknown === 'number';
}

function isStoredState(value: unknown): value is StoredState {
  if (
    !isRecord(value) ||
    value.version !== STORAGE_VERSION ||
    !Array.isArray(value.cards) ||
    !value.cards.every(isCard) ||
    typeof value.direction !== 'string' ||
    !DIRECTIONS.includes(value.direction as Direction) ||
    !isStats(value.stats)
  ) {
    return false;
  }

  if (value.startedMode !== undefined && value.startedMode !== 'simple' && value.startedMode !== 'ring') {
    return false;
  }

  if (value.session === null) return true;
  if (!isSession(value.session)) return false;

  // Сессия, ссылающаяся на отсутствующую карточку, даёт экран тренировки
  // без карточки и без единой кнопки. Такое состояние лучше отвергнуть
  // здесь, чем показывать пользователю пустую страницу.
  const known = new Set(value.cards.map((card) => card.id));
  return sessionCardIds(value.session).every((id) => known.has(id));
}

function sessionCardIds(session: Session): string[] {
  return session.mode === 'ring'
    ? [...session.queue, ...session.blocks.flat()]
    : [...session.queue, ...session.nextRound];
}
