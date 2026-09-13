import { appReducer, initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import type { Card } from '@/core/deck';
import { STORAGE_VERSION } from '@/core/storage';
import type { StoredState } from '@/core/storage';
import type { SimpleSession } from '@/core/session';

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];
const cardsWithoutPinyin: Card[] = cards.map((card) => ({ ...card, pinyin: '' }));

function withDeck(): AppState {
  return appReducer({ ...initialState, hydrated: true }, { type: 'deck-imported', cards });
}

describe('deck-imported', () => {
  it('кладёт колоду и ведёт на экран выбора режима', () => {
    const state = withDeck();
    expect(state.cards).toHaveLength(2);
    expect(state.screen).toBe('mode');
    expect(state.session).toBeNull();
  });

  it('сбрасывает счётчики и старую сессию', () => {
    const started = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    const swiped = appReducer(started, { type: 'swiped', direction: 'right' });
    const reimported = appReducer(swiped, { type: 'deck-imported', cards });
    expect(reimported.stats).toEqual({ known: 0, unknown: 0 });
    expect(reimported.session).toBeNull();
  });

  it('уводит с направления на пиньинь, если пиньиня в колоде нет', () => {
    const state = appReducer(
      { ...initialState, hydrated: true, direction: 'hanzi-to-pinyin' },
      { type: 'deck-imported', cards: cardsWithoutPinyin },
    );
    expect(state.direction).toBe('hanzi-to-translation');
  });
});

describe('session-started и swiped', () => {
  it('старт сессии ведёт на тренировку и запоминает режим', () => {
    const state = appReducer(withDeck(), { type: 'session-started', mode: 'ring' });
    expect(state.screen).toBe('training');
    expect(state.startedMode).toBe('ring');
    expect(state.session?.mode).toBe('ring');
  });

  it('свайп вправо увеличивает счётчик «знаю»', () => {
    const started = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    const state = appReducer(started, { type: 'swiped', direction: 'right' });
    expect(state.stats).toEqual({ known: 1, unknown: 0 });
  });

  it('свайп влево увеличивает счётчик «не знаю»', () => {
    const started = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    const state = appReducer(started, { type: 'swiped', direction: 'left' });
    expect(state.stats).toEqual({ known: 0, unknown: 1 });
  });

  it('завершение сессии ведёт на экран итогов', () => {
    let state = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    state = appReducer(state, { type: 'swiped', direction: 'right' });
    state = appReducer(state, { type: 'swiped', direction: 'right' });
    expect(state.screen).toBe('done');
    expect(state.session?.finished).toBe(true);
  });

  it('свайп без сессии ничего не меняет', () => {
    const state = withDeck();
    expect(appReducer(state, { type: 'swiped', direction: 'right' })).toBe(state);
  });
});

describe('restore', () => {
  const stored = (session: StoredState['session']): StoredState => ({
    version: STORAGE_VERSION,
    cards,
    direction: 'translation-to-hanzi',
    session,
    stats: { known: 3, unknown: 1 },
  });

  it('незавершённая сессия ведёт на экран возобновления', () => {
    const session: SimpleSession = {
      mode: 'simple', round: 2, queue: ['c1'], nextRound: [],
      perfectRound: true, finalRound: false, finished: false,
    };
    const state = appReducer(initialState, { type: 'restore', stored: stored(session) });
    expect(state.screen).toBe('resume');
    expect(state.stats).toEqual({ known: 3, unknown: 1 });
    expect(state.direction).toBe('translation-to-hanzi');
    expect(state.hydrated).toBe(true);
  });

  it('без сессии ведёт на выбор режима', () => {
    const state = appReducer(initialState, { type: 'restore', stored: stored(null) });
    expect(state.screen).toBe('mode');
  });

  it('пустая колода ведёт на импорт', () => {
    const state = appReducer(initialState, {
      type: 'restore',
      stored: { ...stored(null), cards: [] },
    });
    expect(state.screen).toBe('import');
    expect(state.hydrated).toBe(true);
  });
});

describe('навигация', () => {
  it('hydration-finished только поднимает флаг', () => {
    const state = appReducer(initialState, { type: 'hydration-finished' });
    expect(state.hydrated).toBe(true);
    expect(state.screen).toBe('import');
  });

  it('resume-confirmed ведёт на тренировку', () => {
    const state = appReducer({ ...withDeck(), screen: 'resume' }, { type: 'resume-confirmed' });
    expect(state.screen).toBe('training');
  });

  it('go-to-import ведёт на импорт, не трогая колоду', () => {
    const state = appReducer(withDeck(), { type: 'go-to-import' });
    expect(state.screen).toBe('import');
    expect(state.cards).toHaveLength(2);
  });

  it('go-to-mode сбрасывает сессию', () => {
    const started = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    const state = appReducer(started, { type: 'go-to-mode' });
    expect(state.screen).toBe('mode');
    expect(state.session).toBeNull();
  });

  it('direction-changed меняет направление', () => {
    const state = appReducer(withDeck(), { type: 'direction-changed', direction: 'hanzi-to-pinyin' });
    expect(state.direction).toBe('hanzi-to-pinyin');
  });

  it('storage-failed поднимает флаг', () => {
    expect(appReducer(initialState, { type: 'storage-failed' }).storageFailed).toBe(true);
  });
});
