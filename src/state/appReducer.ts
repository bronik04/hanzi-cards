import { hasPinyin } from '@/core/deck';
import type { Card, Direction } from '@/core/deck';
import { createSession, swipe } from '@/core/session';
import type { Session, SessionMode, SwipeDirection } from '@/core/session';
import type { Stats, StoredState } from '@/core/storage';

export type Screen = 'resume' | 'import' | 'mode' | 'training' | 'done';

export type AppState = {
  cards: Card[];
  direction: Direction;
  session: Session | null;
  /** Режим, которым сессия была запущена: после колец session.mode становится 'simple'. */
  startedMode: SessionMode;
  stats: Stats;
  screen: Screen;
  /** true после того, как попытка прочитать хранилище завершилась — успехом или нет. */
  hydrated: boolean;
  storageFailed: boolean;
};

export type AppAction =
  | { type: 'restore'; stored: StoredState }
  | { type: 'hydration-finished' }
  | { type: 'deck-imported'; cards: Card[] }
  | { type: 'direction-changed'; direction: Direction }
  | { type: 'session-started'; mode: SessionMode }
  | { type: 'swiped'; direction: SwipeDirection }
  | { type: 'resume-confirmed' }
  | { type: 'go-to-import' }
  | { type: 'import-cancelled' }
  | { type: 'go-to-mode' }
  | { type: 'storage-failed' };

const NO_STATS: Stats = { known: 0, unknown: 0 };

export const initialState: AppState = {
  cards: [],
  direction: 'hanzi-to-translation',
  session: null,
  startedMode: 'simple',
  stats: NO_STATS,
  screen: 'import',
  hydrated: false,
  storageFailed: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'restore': {
      const { cards, direction, session, stats } = action.stored;
      if (cards.length === 0) {
        return { ...initialState, hydrated: true };
      }
      const resumable = session !== null && !session.finished;
      return {
        ...state,
        cards,
        // Как и при импорте: направление на пиньинь бессмысленно без пиньиня,
        // а сохранённое состояние могло быть записано другой версией.
        direction: availableDirection(direction, cards),
        session: resumable ? session : null,
        // Из session.mode режим не вывести: после колец сессия становится
        // простой, и «Начать заново» запускало бы не тот режим.
        startedMode: action.stored.startedMode ?? (session?.mode === 'ring' ? 'ring' : 'simple'),
        stats,
        screen: resumable ? 'resume' : 'mode',
        hydrated: true,
      };
    }

    case 'hydration-finished':
      return { ...state, hydrated: true };

    case 'deck-imported':
      return {
        ...state,
        cards: action.cards,
        direction: availableDirection(state.direction, action.cards),
        session: null,
        stats: NO_STATS,
        screen: 'mode',
      };

    case 'direction-changed':
      return { ...state, direction: action.direction };

    case 'session-started':
      return {
        ...state,
        session: createSession(
          state.cards.map((card) => card.id),
          action.mode,
        ),
        startedMode: action.mode,
        stats: NO_STATS,
        screen: 'training',
      };

    case 'swiped': {
      if (state.session === null) return state;
      const session = swipe(state.session, action.direction);
      const stats =
        action.direction === 'right'
          ? { ...state.stats, known: state.stats.known + 1 }
          : { ...state.stats, unknown: state.stats.unknown + 1 };
      return { ...state, session, stats, screen: session.finished ? 'done' : 'training' };
    }

    case 'resume-confirmed':
      return { ...state, screen: 'training' };

    case 'go-to-import':
      return { ...state, screen: 'import' };

    // Отмена обязана быть безвредной: сессия остаётся нетронутой,
    // экран возвращается туда, откуда пришли.
    case 'import-cancelled': {
      const training = state.session !== null && !state.session.finished;
      return { ...state, screen: training ? 'training' : 'mode' };
    }

    case 'go-to-mode':
      return { ...state, session: null, screen: 'mode' };

    case 'storage-failed':
      return { ...state, storageFailed: true };
  }
}

/** Направление на пиньинь бессмысленно для колоды без пиньиня. */
function availableDirection(direction: Direction, cards: readonly Card[]): Direction {
  if (direction === 'hanzi-to-pinyin' && !hasPinyin(cards)) return 'hanzi-to-translation';
  return direction;
}
