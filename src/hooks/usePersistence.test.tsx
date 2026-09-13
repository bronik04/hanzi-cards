import { renderHook } from '@testing-library/react';
import { useReducer } from 'react';
import { usePersistence } from '@/hooks/usePersistence';
import { STORAGE_KEY, STORAGE_VERSION } from '@/core/storage';
import type { StorageLike, StoredState } from '@/core/storage';
import { appReducer, initialState } from '@/state/appReducer';

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

const stored: StoredState = {
  version: STORAGE_VERSION,
  cards: [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' }],
  direction: 'hanzi-to-translation',
  session: null,
  stats: { known: 0, unknown: 0 },
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
    expect(result.current.cards).toHaveLength(1);
    expect(result.current.screen).toBe('mode');
    expect(result.current.hydrated).toBe(true);
  });

  it('не затирает сохранённое состояние пустым при старте', () => {
    const { storage, data } = memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
    renderWithPersistence(storage);
    const written = JSON.parse(data[STORAGE_KEY] ?? '{}') as StoredState;
    expect(written.cards).toHaveLength(1);
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
