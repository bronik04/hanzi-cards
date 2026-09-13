import { STORAGE_KEY, STORAGE_VERSION, deserialize, loadState, saveState } from '@/core/storage';
import type { StorageLike, StoredState } from '@/core/storage';

function memoryStorage(
  initial: Record<string, string> = {},
): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const valid: StoredState = {
  version: STORAGE_VERSION,
  cards: [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' }],
  direction: 'hanzi-to-translation',
  session: {
    mode: 'simple',
    round: 1,
    queue: ['c1'],
    nextRound: [],
    perfectRound: true,
    finalRound: false,
    finished: false,
  },
  stats: { known: 0, unknown: 0 },
  startedMode: 'simple',
};

describe('saveState и loadState', () => {
  it('сохраняет и читает состояние без потерь', () => {
    const storage = memoryStorage();
    expect(saveState(storage, valid)).toBe(true);
    expect(loadState(storage)).toEqual(valid);
  });

  it('пишет ровно по ключу flashcards.v2', () => {
    const storage = memoryStorage();
    saveState(storage, valid);
    expect(Object.keys(storage.data)).toEqual([STORAGE_KEY]);
  });

  it('сохраняет сессию колец', () => {
    const storage = memoryStorage();
    const ringState: StoredState = {
      ...valid,
      session: { mode: 'ring', blocks: [['c1']], blockIndex: 0, queue: ['c1'], finished: false },
    };
    saveState(storage, ringState);
    expect(loadState(storage)).toEqual(ringState);
  });

  it('возвращает false, если хранилище отказало', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(saveState(failing, valid)).toBe(false);
  });

  it('не падает, если чтение отказало', () => {
    const failing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    };
    expect(loadState(failing)).toBeNull();
  });
});

describe('deserialize', () => {
  it('на отсутствующем значении даёт null', () => {
    expect(deserialize(null)).toBeNull();
  });

  it('на битом JSON даёт null', () => {
    expect(deserialize('{не json')).toBeNull();
  });

  it('на чужой версии даёт null', () => {
    expect(deserialize(JSON.stringify({ ...valid, version: 1 }))).toBeNull();
  });

  it('на неполной структуре даёт null', () => {
    expect(deserialize(JSON.stringify({ version: STORAGE_VERSION, cards: [] }))).toBeNull();
  });

  it('на неизвестном направлении даёт null', () => {
    expect(deserialize(JSON.stringify({ ...valid, direction: 'hanzi-to-mars' }))).toBeNull();
  });

  it('на карточке без поля даёт null', () => {
    const broken = { ...valid, cards: [{ id: 'c1', hanzi: '你好' }] };
    expect(deserialize(JSON.stringify(broken))).toBeNull();
  });

  it('на сессии с числами вместо идентификаторов даёт null', () => {
    const broken = { ...valid, session: { ...valid.session, queue: [1, 2] } };
    expect(deserialize(JSON.stringify(broken))).toBeNull();
  });

  it('принимает состояние без активной сессии', () => {
    expect(deserialize(JSON.stringify({ ...valid, session: null }))).not.toBeNull();
  });
});

describe('deserialize: связь сессии с колодой', () => {
  it('отвергает сессию, ссылающуюся на отсутствующую карточку', () => {
    const orphan = {
      ...valid,
      session: { ...valid.session, queue: ['нет-такой-карточки'] },
    };
    expect(deserialize(JSON.stringify(orphan))).toBeNull();
  });

  it('отвергает блок колец с отсутствующей карточкой', () => {
    const orphan = {
      ...valid,
      session: {
        mode: 'ring',
        blocks: [['c1'], ['призрак']],
        blockIndex: 0,
        queue: ['c1'],
        finished: false,
      },
    };
    expect(deserialize(JSON.stringify(orphan))).toBeNull();
  });

  it('принимает сессию, все карточки которой есть в колоде', () => {
    expect(deserialize(JSON.stringify(valid))).not.toBeNull();
  });
});

describe('startedMode', () => {
  it('сохраняется и читается', () => {
    const storage = memoryStorage();
    saveState(storage, { ...valid, startedMode: 'ring' });
    expect(loadState(storage)?.startedMode).toBe('ring');
  });

  it('состояние без startedMode остаётся читаемым', () => {
    const withoutMode: Record<string, unknown> = { ...valid };
    delete withoutMode.startedMode;
    expect(deserialize(JSON.stringify(withoutMode))).not.toBeNull();
  });
});
