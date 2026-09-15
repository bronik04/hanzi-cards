import { renderHook } from '@testing-library/react';
import { useReducer } from 'react';
import { usePersistence } from '@/hooks/usePersistence';
import { LEGACY_STORAGE_KEY, STORAGE_KEY, STORAGE_VERSION } from '@/core/storage';
import type { StorageLike, StoredState } from '@/core/storage';
import { appReducer, initialState } from '@/state/appReducer';
import { createDeck } from '@/core/library';

function memoryStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  const storage: StorageLike = {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
  return { storage, data };
}

const deck = createDeck(
  'Юнит 1',
  [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' }],
  new Date('2026-09-14T10:00:00Z'),
);

const stored: StoredState = {
  version: STORAGE_VERSION,
  decks: [deck],
  activeDeckId: deck.id,
};

function renderWithPersistence(storage: StorageLike | null) {
  return renderHook(() => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    usePersistence(state, dispatch, storage);
    return state;
  });
}

describe('usePersistence', () => {
  it('восстанавливает сохранённое состояние при монтировании', () => {
    const { storage } = memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
    const { result } = renderWithPersistence(storage);
    expect(result.current.decks).toHaveLength(1);
    expect(result.current.activeDeckId).toBe(deck.id);
    expect(result.current.screen).toBe('library');
    expect(result.current.hydrated).toBe(true);
  });

  it('не затирает сохранённое состояние пустым при старте', () => {
    const { storage, data } = memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
    renderWithPersistence(storage);
    const written = JSON.parse(data[STORAGE_KEY] ?? '{}') as StoredState;
    expect(written.decks).toHaveLength(1);
  });

  it('на пустом хранилище поднимает hydrated и остаётся на импорте', () => {
    const { storage } = memoryStorage();
    const { result } = renderWithPersistence(storage);
    expect(result.current.hydrated).toBe(true);
    expect(result.current.screen).toBe('import');
  });

  it('записывает состояние после гидратации', () => {
    const { storage, data } = memoryStorage();
    renderWithPersistence(storage);
    expect(data[STORAGE_KEY]).toBeDefined();
    expect(JSON.parse(data[STORAGE_KEY] ?? '{}')).toMatchObject({ version: STORAGE_VERSION });
  });

  // Нечитаемое значение — единственная копия библиотеки. Пока оно цело, колоду
  // можно спасти руками; запись пустой библиотекой уничтожает её за один кадр.
  it('нечитаемый v3 не перезаписывается пустой библиотекой', () => {
    const broken = '{не json';
    const { storage, data } = memoryStorage({ [STORAGE_KEY]: broken });
    const { result } = renderWithPersistence(storage);

    expect(result.current.hydrated).toBe(true);
    expect(result.current.storageUnreadable).toBe(true);
    expect(data[STORAGE_KEY]).toBe(broken);
  });

  it('нечитаемый v3 не подменяется колодой из v2 и не переписывается ею', () => {
    const broken = '{не json';
    const legacy = JSON.stringify({
      version: 2,
      cards: deck.cards,
      direction: 'hanzi-to-translation',
      session: null,
      stats: { known: 0, unknown: 0 },
    });
    const { storage, data } = memoryStorage({
      [STORAGE_KEY]: broken,
      [LEGACY_STORAGE_KEY]: legacy,
    });
    const { result } = renderWithPersistence(storage);

    expect(result.current.decks).toHaveLength(0);
    expect(result.current.storageUnreadable).toBe(true);
    expect(data[STORAGE_KEY]).toBe(broken);
    expect(data[LEGACY_STORAGE_KEY]).toBe(legacy);
  });

  it('поднимает storageFailed, если запись отказала', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const { result } = renderWithPersistence(failing);
    expect(result.current.storageFailed).toBe(true);
  });

  it('без хранилища работает молча', () => {
    const { result } = renderWithPersistence(null);
    expect(result.current.hydrated).toBe(true);
    expect(result.current.storageFailed).toBe(false);
  });
});
