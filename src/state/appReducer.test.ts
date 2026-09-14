import { activeDeck, appReducer, initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import { STORAGE_VERSION } from '@/core/storage';
import type { Card } from '@/core/deck';

const AT = new Date('2026-09-14T10:00:00Z');
const LATER = new Date('2026-09-20T10:00:00Z');

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function hydrated(decks: Deck[] = [], activeDeckId: string | null = null): AppState {
  return { ...initialState, hydrated: true, decks, activeDeckId, screen: 'library' };
}

function withOneDeck(): AppState {
  return appReducer(hydrated(), { type: 'deck-created', name: 'Юнит 1', cards, now: AT });
}

describe('deck-created', () => {
  it('добавляет колоду, делает активной и ведёт на выбор режима', () => {
    const state = withOneDeck();
    expect(state.decks).toHaveLength(1);
    expect(state.screen).toBe('mode');
    expect(activeDeck(state)?.name).toBe('Юнит 1');
  });

  it('разводит совпавшие имена', () => {
    const state = appReducer(withOneDeck(), {
      type: 'deck-created', name: 'Юнит 1', cards, now: AT,
    });
    expect(state.decks.map((d) => d.name)).toEqual(['Юнит 1', 'Юнит 1 (2)']);
  });

  it('не трогает уже существующие колоды', () => {
    const first = withOneDeck();
    const second = appReducer(first, { type: 'deck-created', name: 'Юнит 2', cards, now: AT });
    expect(second.decks[0]).toEqual(first.decks[0]);
  });
});

describe('deck-opened', () => {
  it('без сессии ведёт на выбор режима', () => {
    const state = withOneDeck();
    const id = state.decks[0]?.id ?? '';
    const opened = appReducer({ ...state, screen: 'library' }, { type: 'deck-opened', id, now: LATER });
    expect(opened.screen).toBe('mode');
    expect(opened.activeDeckId).toBe(id);
  });

  it('с незавершённой сессией ведёт на возобновление', () => {
    let state = withOneDeck();
    state = appReducer(state, { type: 'session-started', mode: 'simple' });
    const id = state.decks[0]?.id ?? '';
    const opened = appReducer({ ...state, screen: 'library' }, { type: 'deck-opened', id, now: LATER });
    expect(opened.screen).toBe('resume');
  });

  it('обновляет отметку последнего открытия', () => {
    const state = withOneDeck();
    const id = state.decks[0]?.id ?? '';
    const opened = appReducer(state, { type: 'deck-opened', id, now: LATER });
    expect(opened.decks[0]?.lastOpenedAt).toBe(LATER.toISOString());
  });

  it('несуществующая колода ничего не меняет', () => {
    const state = withOneDeck();
    expect(appReducer(state, { type: 'deck-opened', id: 'призрак', now: LATER })).toBe(state);
  });
});

describe('deck-renamed и deck-deleted', () => {
  it('переименование меняет только имя', () => {
    const state = withOneDeck();
    const id = state.decks[0]?.id ?? '';
    const renamed = appReducer(state, { type: 'deck-renamed', id, name: 'Другое' });
    expect(renamed.decks[0]?.name).toBe('Другое');
    expect(renamed.decks[0]?.cards).toHaveLength(2);
  });

  it('удаление убирает колоду и ведёт в библиотеку', () => {
    const state = withOneDeck();
    const id = state.decks[0]?.id ?? '';
    const deleted = appReducer(state, { type: 'deck-deleted', id });
    expect(deleted.decks).toHaveLength(0);
    expect(deleted.screen).toBe('library');
  });

  it('удаление активной колоды сбрасывает активную', () => {
    const state = withOneDeck();
    const id = state.decks[0]?.id ?? '';
    expect(appReducer(state, { type: 'deck-deleted', id }).activeDeckId).toBeNull();
  });

  it('удаление другой колоды активную не трогает', () => {
    const first = withOneDeck();
    const second = appReducer(first, { type: 'deck-created', name: 'Юнит 2', cards, now: AT });
    const firstId = second.decks[0]?.id ?? '';
    const deleted = appReducer(second, { type: 'deck-deleted', id: firstId });
    expect(deleted.activeDeckId).toBe(second.activeDeckId);
  });
});

describe('тренировка идёт в активной колоде', () => {
  function twoDecks(): AppState {
    const first = withOneDeck();
    return appReducer(first, { type: 'deck-created', name: 'Юнит 2', cards, now: AT });
  }

  it('свайп меняет счётчики только активной колоды', () => {
    let state = twoDecks();
    state = appReducer(state, { type: 'session-started', mode: 'simple' });
    state = appReducer(state, { type: 'swiped', direction: 'right' });

    expect(state.decks[1]?.stats).toEqual({ known: 1, unknown: 0 });
    expect(state.decks[0]?.stats).toEqual({ known: 0, unknown: 0 });
  });

  it('сессия одной колоды переживает работу в другой', () => {
    let state = twoDecks();
    state = appReducer(state, { type: 'session-started', mode: 'simple' });
    state = appReducer(state, { type: 'swiped', direction: 'right' });
    const secondSession = state.decks[1]?.session;

    const firstId = state.decks[0]?.id ?? '';
    state = appReducer(state, { type: 'deck-opened', id: firstId, now: LATER });
    state = appReducer(state, { type: 'session-started', mode: 'ring' });

    expect(state.decks[1]?.session).toEqual(secondSession);
  });

  it('старт сессии ведёт на тренировку и запоминает режим', () => {
    const state = appReducer(withOneDeck(), { type: 'session-started', mode: 'ring' });
    expect(state.screen).toBe('training');
    expect(activeDeck(state)?.startedMode).toBe('ring');
    expect(activeDeck(state)?.session?.mode).toBe('ring');
  });

  it('завершение сессии ведёт на итоги', () => {
    let state = withOneDeck();
    state = appReducer(state, { type: 'session-started', mode: 'simple' });
    state = appReducer(state, { type: 'swiped', direction: 'right' });
    state = appReducer(state, { type: 'swiped', direction: 'right' });
    expect(state.screen).toBe('done');
  });

  it('смена направления меняет направление активной колоды', () => {
    const state = appReducer(withOneDeck(), {
      type: 'direction-changed', direction: 'translation-to-hanzi',
    });
    expect(activeDeck(state)?.direction).toBe('translation-to-hanzi');
  });

  it('go-to-mode бросает сессию активной колоды', () => {
    let state = appReducer(withOneDeck(), { type: 'session-started', mode: 'simple' });
    state = appReducer(state, { type: 'go-to-mode' });
    expect(activeDeck(state)?.session).toBeNull();
    expect(state.screen).toBe('mode');
  });

  it('без активной колоды действия тренировки ничего не меняют', () => {
    const state = hydrated();
    expect(appReducer(state, { type: 'session-started', mode: 'simple' })).toBe(state);
    expect(appReducer(state, { type: 'swiped', direction: 'right' })).toBe(state);
  });

  it('свайп без сессии в активной колоде ничего не меняет', () => {
    const state = withOneDeck();
    expect(appReducer(state, { type: 'swiped', direction: 'right' })).toBe(state);
  });
});

describe('restore', () => {
  const stored = (decks: Deck[], activeDeckId: string | null) => ({
    version: STORAGE_VERSION as 3, decks, activeDeckId,
  });

  it('колоды есть — ведёт в библиотеку', () => {
    const deck = createDeck('Юнит 1', cards, AT);
    const state = appReducer(initialState, { type: 'restore', stored: stored([deck], deck.id) });
    expect(state.screen).toBe('library');
    expect(state.hydrated).toBe(true);
  });

  it('колод нет — ведёт на импорт', () => {
    const state = appReducer(initialState, { type: 'restore', stored: stored([], null) });
    expect(state.screen).toBe('import');
  });

  it('исправляет направление на пиньинь у колоды без пиньиня', () => {
    const noPinyin = cards.map((card) => ({ ...card, pinyin: '' }));
    const deck = { ...createDeck('Без пиньиня', noPinyin, AT), direction: 'hanzi-to-pinyin' as const };
    const state = appReducer(initialState, { type: 'restore', stored: stored([deck], deck.id) });
    expect(state.decks[0]?.direction).toBe('hanzi-to-translation');
  });
});

describe('навигация', () => {
  it('go-to-library ведёт в библиотеку', () => {
    expect(appReducer(withOneDeck(), { type: 'go-to-library' }).screen).toBe('library');
  });

  it('отмена импорта возвращает в библиотеку, если колоды есть', () => {
    const state = appReducer(withOneDeck(), { type: 'go-to-import' });
    expect(appReducer(state, { type: 'import-cancelled' }).screen).toBe('library');
  });

  it('отмена импорта при пустой библиотеке оставляет на импорте', () => {
    const state = { ...hydrated(), screen: 'import' as const };
    expect(appReducer(state, { type: 'import-cancelled' }).screen).toBe('import');
  });

  it('decks-imported заменяет список и ведёт в библиотеку', () => {
    const imported = [createDeck('Из файла', cards, AT)];
    const state = appReducer(withOneDeck(), { type: 'decks-imported', decks: imported });
    expect(state.decks.map((d) => d.name)).toEqual(['Из файла']);
    expect(state.screen).toBe('library');
  });

  it('decks-imported сбрасывает activeDeckId, если его не стало в новом списке', () => {
    const state = withOneDeck();
    const imported = [createDeck('Из файла', cards, AT)];
    const result = appReducer(state, { type: 'decks-imported', decks: imported });
    expect(result.activeDeckId).toBeNull();
  });

  it('storage-failed поднимает флаг', () => {
    expect(appReducer(initialState, { type: 'storage-failed' }).storageFailed).toBe(true);
  });
});
