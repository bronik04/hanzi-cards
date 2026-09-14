import type { Card, Direction } from '@/core/deck';
import { newId } from '@/core/id';
import type { Session, SessionMode, Stats } from '@/core/session';

export type Deck = {
  id: string;
  name: string;
  createdAt: string;
  /** По нему сортируется список библиотеки. */
  lastOpenedAt: string;
  cards: Card[];
  direction: Direction;
  session: Session | null;
  stats: Stats;
  /** Режим, которым сессия была запущена: после колец session.mode становится 'simple'. */
  startedMode: SessionMode;
};

export const NO_STATS: Stats = { known: 0, unknown: 0 };

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function createDeck(name: string, cards: Card[], now: Date): Deck {
  const at = now.toISOString();
  return {
    id: newId(),
    name,
    createdAt: at,
    lastOpenedAt: at,
    cards,
    direction: 'hanzi-to-translation',
    session: null,
    stats: NO_STATS,
    startedMode: 'simple',
  };
}

export function findDeck(decks: readonly Deck[], id: string | null): Deck | null {
  if (id === null) return null;
  return decks.find((deck) => deck.id === id) ?? null;
}

export function replaceDeck(decks: readonly Deck[], deck: Deck): Deck[] {
  return decks.map((current) => (current.id === deck.id ? deck : current));
}

export function renameDeck(decks: readonly Deck[], id: string, name: string): Deck[] {
  return decks.map((deck) => (deck.id === id ? { ...deck, name } : deck));
}

export function removeDeck(decks: readonly Deck[], id: string): Deck[] {
  return decks.filter((deck) => deck.id !== id);
}

export function touchDeck(decks: readonly Deck[], id: string, now: Date): Deck[] {
  return decks.map((deck) => (deck.id === id ? { ...deck, lastOpenedAt: now.toISOString() } : deck));
}

/** Копия списка, недавно открытые первыми. Исходный список не меняется. */
export function byRecent(decks: readonly Deck[]): Deck[] {
  return [...decks].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

/** «Юнит 1» при занятом имени превращается в «Юнит 1 (2)», затем «(3)» и дальше. */
export function uniqueName(decks: readonly Deck[], name: string): string {
  const taken = new Set(decks.map((deck) => deck.name));
  if (!taken.has(name)) return name;

  let index = 2;
  while (taken.has(`${name} (${index})`)) index += 1;
  return `${name} (${index})`;
}

/** Имя-подсказка для новой колоды. Месяцы списком, а не через Intl: так вывод
 *  не зависит от локали окружения и от версии данных ICU. */
export function suggestedName(now: Date): string {
  const month = MONTHS[now.getUTCMonth()] ?? '';
  return `Колода от ${now.getUTCDate()} ${month} ${now.getUTCFullYear()}`;
}
