import { hasPinyin } from '@/core/deck';
import type { Card, Direction } from '@/core/deck';
import {
  NO_STATS,
  createDeck,
  findDeck,
  removeDeck,
  renameDeck,
  replaceDeck,
  touchDeck,
  uniqueName,
} from '@/core/library';
import type { Deck } from '@/core/library';
import { createSession, swipe } from '@/core/session';
import type { SessionMode, SwipeDirection } from '@/core/session';
import type { StoredState } from '@/core/storage';

export type Screen = 'library' | 'import' | 'resume' | 'mode' | 'training' | 'done';

export type AppState = {
  decks: Deck[];
  activeDeckId: string | null;
  screen: Screen;
  /** true после того, как попытка прочитать хранилище завершилась — успехом или нет. */
  hydrated: boolean;
  storageFailed: boolean;
};

/** Действия, которым нужна открытая колода. */
type DeckAction =
  | { type: 'direction-changed'; direction: Direction }
  | { type: 'session-started'; mode: SessionMode }
  | { type: 'swiped'; direction: SwipeDirection }
  | { type: 'resume-confirmed' }
  | { type: 'go-to-mode' };

export type AppAction =
  | { type: 'restore'; stored: StoredState }
  | { type: 'hydration-finished' }
  | { type: 'deck-created'; name: string; cards: Card[]; now: Date }
  | { type: 'deck-opened'; id: string; now: Date }
  | { type: 'deck-renamed'; id: string; name: string }
  | { type: 'deck-deleted'; id: string }
  | { type: 'decks-imported'; decks: Deck[] }
  | { type: 'go-to-library' }
  | { type: 'go-to-import' }
  | { type: 'import-cancelled' }
  | { type: 'storage-failed' }
  | DeckAction;

export const initialState: AppState = {
  decks: [],
  activeDeckId: null,
  screen: 'import',
  hydrated: false,
  storageFailed: false,
};

export function activeDeck(state: AppState): Deck | null {
  return findDeck(state.decks, state.activeDeckId);
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'restore': {
      const { decks, activeDeckId } = action.stored;
      return {
        ...state,
        decks: decks.map(withAvailableDirection),
        activeDeckId,
        // Правило действует только здесь: дальше экран меняют действия, и
        // удаление последней колоды оставляет пользователя в библиотеке.
        screen: decks.length === 0 ? 'import' : 'library',
        hydrated: true,
      };
    }

    case 'hydration-finished':
      return { ...state, hydrated: true };

    case 'deck-created': {
      const deck = createDeck(uniqueName(state.decks, action.name), action.cards, action.now);
      return { ...state, decks: [...state.decks, deck], activeDeckId: deck.id, screen: 'mode' };
    }

    case 'deck-opened': {
      const deck = findDeck(state.decks, action.id);
      if (deck === null) return state;
      const resumable = deck.session !== null && !deck.session.finished;
      return {
        ...state,
        decks: touchDeck(state.decks, action.id, action.now),
        activeDeckId: action.id,
        screen: resumable ? 'resume' : 'mode',
      };
    }

    case 'deck-renamed':
      return { ...state, decks: renameDeck(state.decks, action.id, action.name) };

    case 'deck-deleted':
      return {
        ...state,
        decks: removeDeck(state.decks, action.id),
        activeDeckId: state.activeDeckId === action.id ? null : state.activeDeckId,
        screen: 'library',
      };

    case 'decks-imported':
      return { ...state, decks: action.decks, screen: 'library' };

    case 'go-to-library':
      return { ...state, screen: 'library' };

    case 'go-to-import':
      return { ...state, screen: 'import' };

    // Отмена обязана быть безвредной: колоды остаются нетронутыми.
    case 'import-cancelled':
      return { ...state, screen: state.decks.length === 0 ? 'import' : 'library' };

    case 'storage-failed':
      return { ...state, storageFailed: true };

    case 'direction-changed':
    case 'session-started':
    case 'swiped':
    case 'resume-confirmed':
    case 'go-to-mode':
      return applyToActiveDeck(state, action);
  }
}

function applyToActiveDeck(state: AppState, action: DeckAction): AppState {
  const deck = activeDeck(state);
  if (deck === null) return state;

  switch (action.type) {
    case 'direction-changed':
      return withDeck(state, { ...deck, direction: action.direction });

    case 'session-started':
      return withDeck(
        state,
        {
          ...deck,
          session: createSession(
            deck.cards.map((card) => card.id),
            action.mode,
          ),
          startedMode: action.mode,
          stats: NO_STATS,
        },
        'training',
      );

    case 'swiped': {
      if (deck.session === null) return state;
      const session = swipe(deck.session, action.direction);
      const stats =
        action.direction === 'right'
          ? { ...deck.stats, known: deck.stats.known + 1 }
          : { ...deck.stats, unknown: deck.stats.unknown + 1 };
      return withDeck(state, { ...deck, session, stats }, session.finished ? 'done' : 'training');
    }

    case 'resume-confirmed':
      return { ...state, screen: 'training' };

    case 'go-to-mode':
      return withDeck(state, { ...deck, session: null }, 'mode');
  }
}

function withDeck(state: AppState, deck: Deck, screen?: Screen): AppState {
  return { ...state, decks: replaceDeck(state.decks, deck), screen: screen ?? state.screen };
}

/** Направление на пиньинь бессмысленно для колоды без пиньиня. */
function withAvailableDirection(deck: Deck): Deck {
  if (deck.direction === 'hanzi-to-pinyin' && !hasPinyin(deck.cards)) {
    return { ...deck, direction: 'hanzi-to-translation' };
  }
  return deck;
}
