import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  STORAGE_VERSION,
  deserialize,
  loadState,
  migrateFromV2,
  parseDeckList,
  saveState,
} from '@/core/storage';
import type { LoadOutcome, StorageLike, StoredState } from '@/core/storage';
import type { Deck } from '@/core/library';

// Локальный конструктор, а не UTC-строка: suggestedName берёт локальные поля,
// и западнее Гринвича 10:00 UTC — это уже предыдущий день.
const AT = new Date(2026, 8, 14, 10, 0, 0);

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

const deck: Deck = {
  id: 'd1',
  name: 'Юнит 1',
  createdAt: AT.toISOString(),
  lastOpenedAt: AT.toISOString(),
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

const valid: StoredState = { version: STORAGE_VERSION, decks: [deck], activeDeckId: 'd1' };

/** Состояние удачной загрузки; иначе null, чтобы тест падал по существу. */
function restoredState(outcome: LoadOutcome): StoredState | null {
  return outcome.status === 'restored' ? outcome.state : null;
}

const LEGACY_V2 = JSON.stringify({
  version: 2,
  cards: deck.cards,
  direction: 'hanzi-to-translation',
  session: null,
  stats: { known: 0, unknown: 0 },
});

describe('saveState и loadState', () => {
  it('сохраняет и читает библиотеку без потерь', () => {
    const storage = memoryStorage();
    expect(saveState(storage, valid)).toBe(true);
    expect(restoredState(loadState(storage, AT))).toEqual(valid);
  });

  it('сохраняет сессию колец', () => {
    const storage = memoryStorage();
    const ringState: StoredState = {
      ...valid,
      decks: [
        {
          ...deck,
          session: { mode: 'ring', blocks: [['c1']], blockIndex: 0, queue: ['c1'], finished: false },
        },
      ],
    };
    expect(saveState(storage, ringState)).toBe(true);
    expect(restoredState(loadState(storage, AT))).toEqual(ringState);
  });

  it('пишет ровно по ключу flashcards.v3', () => {
    const storage = memoryStorage();
    saveState(storage, valid);
    expect(Object.keys(storage.data)).toEqual([STORAGE_KEY]);
  });

  it('возвращает false, если запись отказала', () => {
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
    expect(loadState(failing, AT)).toEqual({ status: 'empty' });
  });

  it('пустое хранилище даёт empty', () => {
    expect(loadState(memoryStorage(), AT)).toEqual({ status: 'empty' });
  });

  // Пустое и нечитаемое различаются именно здесь: поверх пустого пишут сразу,
  // а поверх нечитаемого писать нельзя — это единственная копия библиотеки.
  it('нечитаемое значение v3 не выдаётся за пустое хранилище', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{не json' });
    expect(loadState(storage, AT)).toEqual({ status: 'unreadable' });
  });

  it('v3 непроходящий проверку тоже даёт unreadable', () => {
    const broken = JSON.stringify({ ...valid, decks: [{ ...deck, name: undefined }] });
    expect(loadState(memoryStorage({ [STORAGE_KEY]: broken }), AT)).toEqual({
      status: 'unreadable',
    });
  });

  // Иначе колода Этапа 0 молча стала бы всей библиотекой и легла поверх v3.
  it('нечитаемый v3 не откатывается на перенос из v2', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{не json', [LEGACY_STORAGE_KEY]: LEGACY_V2 });
    expect(loadState(storage, AT)).toEqual({ status: 'unreadable' });
  });
});

describe('deserialize', () => {
  it('на битом JSON даёт null', () => {
    expect(deserialize('{не json')).toBeNull();
  });

  it('на чужой версии даёт null', () => {
    expect(deserialize(JSON.stringify({ ...valid, version: 2 }))).toBeNull();
  });

  it('на колоде без обязательного поля даёт null', () => {
    const broken = { ...valid, decks: [{ ...deck, name: undefined }] };
    expect(deserialize(JSON.stringify(broken))).toBeNull();
  });

  it('на неизвестном направлении даёт null', () => {
    const broken = { ...valid, decks: [{ ...deck, direction: 'hanzi-to-mars' }] };
    expect(deserialize(JSON.stringify(broken))).toBeNull();
  });

  it('отвергает сессию, ссылающуюся на отсутствующую карточку', () => {
    const orphan = { ...valid, decks: [{ ...deck, session: { ...deck.session, queue: ['нет'] } }] };
    expect(deserialize(JSON.stringify(orphan))).toBeNull();
  });

  it('отвергает блок колец с отсутствующей карточкой', () => {
    const orphan = {
      ...valid,
      decks: [
        {
          ...deck,
          session: { mode: 'ring', blocks: [['c1'], ['нет']], blockIndex: 0, queue: ['c1'], finished: false },
        },
      ],
    };
    expect(deserialize(JSON.stringify(orphan))).toBeNull();
  });

  it('проверяет ссылки в каждой колоде, а не только в первой', () => {
    const second: Deck = { ...deck, id: 'd2', cards: [], session: { ...deck.session!, queue: ['c1'] } };
    expect(deserialize(JSON.stringify({ ...valid, decks: [deck, second] }))).toBeNull();
  });

  it('принимает библиотеку без активной колоды', () => {
    expect(deserialize(JSON.stringify({ ...valid, activeDeckId: null }))).not.toBeNull();
  });

  it('принимает пустую библиотеку', () => {
    expect(deserialize(JSON.stringify({ version: STORAGE_VERSION, decks: [], activeDeckId: null }))).not.toBeNull();
  });

  it('отвергает активную колоду, которой нет в списке', () => {
    expect(deserialize(JSON.stringify({ ...valid, activeDeckId: 'призрак' }))).toBeNull();
  });
});

describe('migrateFromV2', () => {
  const v2 = {
    version: 2,
    cards: deck.cards,
    direction: 'translation-to-hanzi',
    session: deck.session,
    stats: { known: 3, unknown: 1 },
    startedMode: 'ring',
  };

  it('оборачивает единственную колоду в библиотеку', () => {
    const migrated = migrateFromV2(JSON.stringify(v2), AT);
    expect(migrated?.decks).toHaveLength(1);
    const only = migrated?.decks[0];
    expect(only?.name).toBe('Колода от 14 сентября 2026');
    expect(only?.cards).toEqual(deck.cards);
    expect(only?.direction).toBe('translation-to-hanzi');
    expect(only?.session).toEqual(deck.session);
    expect(only?.stats).toEqual({ known: 3, unknown: 1 });
    expect(only?.startedMode).toBe('ring');
    expect(migrated?.activeDeckId).toBe(only?.id);
  });

  it('без startedMode подставляет simple', () => {
    const withoutMode: Record<string, unknown> = { ...v2 };
    delete withoutMode.startedMode;
    expect(migrateFromV2(JSON.stringify(withoutMode), AT)?.decks[0]?.startedMode).toBe('simple');
  });

  it('на отсутствии данных даёт null', () => {
    expect(migrateFromV2(null, AT)).toBeNull();
  });

  it('на битых данных даёт null', () => {
    expect(migrateFromV2('{не json', AT)).toBeNull();
    expect(migrateFromV2(JSON.stringify({ version: 1 }), AT)).toBeNull();
  });

  it('на неизвестном направлении в v2 даёт null', () => {
    const broken = { ...v2, direction: 'hanzi-to-mars' };
    expect(migrateFromV2(JSON.stringify(broken), AT)).toBeNull();
  });

  it('на битой статистике в v2 даёт null', () => {
    const broken = { ...v2, stats: { known: 'много' } };
    expect(migrateFromV2(JSON.stringify(broken), AT)).toBeNull();
  });

  it('на сессии неправильной формы в v2 даёт null', () => {
    const broken = { ...v2, session: { mode: 'simple' } };
    expect(migrateFromV2(JSON.stringify(broken), AT)).toBeNull();
  });

  it('отвергает сессию v2, ссылающуюся на отсутствующую карточку', () => {
    const orphan = { ...v2, session: { ...v2.session, queue: ['нет'] } };
    expect(migrateFromV2(JSON.stringify(orphan), AT)).toBeNull();
  });
});

describe('parseDeckList', () => {
  it('возвращает колоды из выгрузки', () => {
    const raw = JSON.stringify({ version: STORAGE_VERSION, decks: [deck] });
    expect(parseDeckList(raw)).toEqual([deck]);
  });

  it('не требует activeDeckId', () => {
    expect(parseDeckList(JSON.stringify({ version: STORAGE_VERSION, decks: [] }))).toEqual([]);
  });

  // Ключевое отличие от deserialize: тот же вход тот отвергает целиком.
  it('пропускает колоду с висячей ссылкой сессии, в отличие от deserialize', () => {
    const broken = { ...deck, session: { ...deck.session, queue: ['нет такой'] } };
    const raw = JSON.stringify({ version: STORAGE_VERSION, decks: [broken] });
    expect(parseDeckList(raw)).toHaveLength(1);
    expect(deserialize(JSON.stringify({ ...valid, decks: [broken] }))).toBeNull();
  });

  it('битый JSON и чужую версию отвергает', () => {
    expect(parseDeckList('{не json')).toBeNull();
    expect(parseDeckList(JSON.stringify({ version: 99, decks: [] }))).toBeNull();
  });

  it('отвергает колоду с битой формой', () => {
    const raw = JSON.stringify({
      version: STORAGE_VERSION,
      decks: [{ ...deck, direction: 'hanzi-to-mars' }],
    });
    expect(parseDeckList(raw)).toBeNull();
  });
});

describe('нечисловые числа', () => {
  /** Подстановка, которую JSON.stringify не умеет записать сам. */
  const INFINITY = '@@бесконечность@@';
  const withInfinity = (value: unknown) =>
    JSON.stringify(value).replace(`"${INFINITY}"`, '1e999');

  it('в файле 1e999 разбирается как Infinity', () => {
    expect(JSON.parse('1e999')).toBe(Infinity);
  });

  // Infinity проходил проверку типа, а обратно записывался как null: колода
  // сохранялась испорченной и на следующем чтении отвергалась целиком.
  it('parseDeckList отвергает бесконечный счётчик', () => {
    const raw = withInfinity({
      version: STORAGE_VERSION,
      decks: [{ ...deck, stats: { known: INFINITY, unknown: 0 } }],
    });
    expect(parseDeckList(raw)).toBeNull();
  });

  it('deserialize отвергает бесконечный счётчик', () => {
    const raw = withInfinity({
      ...valid,
      decks: [{ ...deck, stats: { known: 0, unknown: INFINITY } }],
    });
    expect(deserialize(raw)).toBeNull();
  });

  it('parseDeckList отвергает бесконечный номер круга', () => {
    const raw = withInfinity({
      version: STORAGE_VERSION,
      decks: [{ ...deck, session: { ...deck.session, round: INFINITY } }],
    });
    expect(parseDeckList(raw)).toBeNull();
  });

  it('parseDeckList отвергает бесконечный номер блока колец', () => {
    const raw = withInfinity({
      version: STORAGE_VERSION,
      decks: [
        {
          ...deck,
          session: {
            mode: 'ring',
            blocks: [['c1']],
            blockIndex: INFINITY,
            queue: ['c1'],
            finished: false,
          },
        },
      ],
    });
    expect(parseDeckList(raw)).toBeNull();
  });

  // Счётчики считают штуки: половины круга и половины блока не бывает.
  it('parseDeckList отвергает дробный номер круга', () => {
    const raw = JSON.stringify({
      version: STORAGE_VERSION,
      decks: [{ ...deck, session: { ...deck.session, round: 1.5 } }],
    });
    expect(parseDeckList(raw)).toBeNull();
  });
});

describe('loadState: перенос', () => {
  it('читает v2, если v3 ещё нет', () => {
    const storage = memoryStorage({
      [LEGACY_STORAGE_KEY]: JSON.stringify({
        version: 2,
        cards: deck.cards,
        direction: 'hanzi-to-translation',
        session: null,
        stats: { known: 0, unknown: 0 },
      }),
    });
    expect(restoredState(loadState(storage, AT))?.decks).toHaveLength(1);
  });

  it('v3 имеет приоритет над v2', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify(valid),
      [LEGACY_STORAGE_KEY]: JSON.stringify({
        version: 2, cards: [], direction: 'hanzi-to-translation', session: null,
        stats: { known: 0, unknown: 0 },
      }),
    });
    expect(restoredState(loadState(storage, AT))?.decks[0]?.name).toBe('Юнит 1');
  });

  it('не трогает и не удаляет старый ключ', () => {
    const legacy = JSON.stringify({
      version: 2, cards: deck.cards, direction: 'hanzi-to-translation', session: null,
      stats: { known: 0, unknown: 0 },
    });
    const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: legacy });
    loadState(storage, AT);
    expect(storage.data[LEGACY_STORAGE_KEY]).toBe(legacy);
  });
});
