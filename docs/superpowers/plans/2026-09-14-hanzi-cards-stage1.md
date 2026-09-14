# Карточки 汉字, Этап 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить единственную колоду в библиотеку: много колод, у каждой своё имя и своя прерванная тренировка, с выгрузкой библиотеки в файл и отдельной колоды таблицей.

**Architecture:** `direction`, `session`, `stats` и `startedMode` переезжают из корня состояния внутрь новой сущности `Deck`. Библиотека целиком лежит под одним ключом localStorage — одна проверка при чтении, одна атомарная запись. Чистая логика библиотеки и обмена файлами живёт в `src/core`, сохранение файла на диск — в слое представления, потому что `core` не имеет доступа к DOM.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + React Testing Library, Playwright. Новых зависимостей не добавляется.

**Спецификация:** [docs/superpowers/specs/2026-09-14-hanzi-cards-stage1-design.md](../specs/2026-09-14-hanzi-cards-stage1-design.md)

## Global Constraints

- Node.js версии из `.nvmrc` (24) или новее.
- Весь интерфейс на русском. Идентификаторы, имена файлов и сообщения коммитов — на английском.
- `src/core/**` не импортирует React и не обращается к `window` и `document`. Проверяется правилом ESLint; доступ к хранилищу передаётся параметром типа `StorageLike`.
- Ключ хранилища — `flashcards.v3`, поле `version` внутри равно `3`. Ключ `flashcards.v2` читается один раз при переносе и никогда не изменяется и не удаляется.
- Текущее время передаётся в `core` параметром `now: Date`. Внутри `core` не вызывается `Date.now()` и `new Date()` без аргументов: иначе тесты становятся недетерминированными.
- Размер блока в режиме колец — 7, константа `BLOCK_SIZE`. Порог свайпа — 80 пикселей, константа `SWIPE_THRESHOLD`.
- Разделитель в выгружаемой таблице — табуляция. Заголовок ровно `иероглиф\tпиньинь\tперевод`.
- Каждая задача заканчивается коммитом в стиле Conventional Commits.
- Сообщения коммитов заканчиваются строкой `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Работа идёт в отдельной ветке. Перед слиянием в `master` проводится код-ревью — это правило пользователя.

## File Structure

| Файл | Ответственность |
|------|-----------------|
| `src/core/library.ts` | Тип `Deck` и операции над списком колод: создание, поиск, переименование, удаление, сортировка, разведение одинаковых имён |
| `src/core/transfer.ts` | Текст файлов обмена: JSON библиотеки, таблица колоды, слияние загруженных колод с существующими, имена файлов |
| `src/core/storage.ts` | Схема `flashcards.v3`, проверка при чтении, перенос из `flashcards.v2` |
| `src/core/session.ts` | Дополняется типом `Stats`, который переезжает сюда из `storage.ts` |
| `src/state/appReducer.ts` | Состояние библиотеки, действия, селектор активной колоды |
| `src/state/AppContext.tsx` | Дополняется хуком `useActiveDeck` |
| `src/hooks/usePersistence.ts` | Чтение и запись библиотеки |
| `src/lib/download.ts` | Сохранение текста в файл через Blob — единственное место, где обмен файлами трогает DOM |
| `src/components/DeckRow.tsx` | Строка колоды со своими режимами переименования и подтверждения удаления |
| `src/screens/LibraryScreen.tsx` | Список колод, кнопки обмена файлами |
| `src/screens/ImportScreen.tsx` | Дополняется полем имени колоды |
| `src/screens/ModeScreen.tsx`, `ResumeScreen.tsx`, `TrainingScreen.tsx`, `DoneScreen.tsx` | Читают колоду через `useActiveDeck` вместо корня состояния |
| `src/App.tsx` | Добавляет экран библиотеки в разбор `screen` |
| `src/styles/app.css` | Стили библиотеки и строки колоды |

Тесты лежат рядом с модулем: `src/core/library.test.ts`, `src/screens/LibraryScreen.test.tsx` и так далее. Сквозные — в `e2e/library.spec.ts`.

**Исходник макетов.** Экраны согласованы по файлу `mockups.html` в корне репозитория; он не в гите. CSS оттуда переносится в `src/styles/app.css` в задаче 5, сам файл удаляется в задаче 9.

---

### Task 1: Тип колоды и операции над библиотекой

`Stats` переезжает из `storage.ts` в `session.ts`. Иначе получится цикл: `storage.ts` будет импортировать `Deck` из `library.ts`, а `library.ts` — `Stats` из `storage.ts`.

**Files:**
- Create: `src/core/library.ts`, `src/core/library.test.ts`
- Modify: `src/core/session.ts`, `src/core/storage.ts`, `src/state/appReducer.ts`

**Interfaces:**
- Consumes: `Card`, `Direction` из `@/core/deck`; `Session`, `SessionMode` из `@/core/session`; `newId` из `@/core/id`
- Produces:
  - `type Stats = { known: number; unknown: number }` — теперь экспортируется из `@/core/session`
  - `type Deck = { id: string; name: string; createdAt: string; lastOpenedAt: string; cards: Card[]; direction: Direction; session: Session | null; stats: Stats; startedMode: SessionMode }`
  - `const NO_STATS: Stats`
  - `createDeck(name: string, cards: Card[], now: Date): Deck`
  - `findDeck(decks: readonly Deck[], id: string | null): Deck | null`
  - `replaceDeck(decks: readonly Deck[], deck: Deck): Deck[]`
  - `renameDeck(decks: readonly Deck[], id: string, name: string): Deck[]`
  - `removeDeck(decks: readonly Deck[], id: string): Deck[]`
  - `touchDeck(decks: readonly Deck[], id: string, now: Date): Deck[]`
  - `byRecent(decks: readonly Deck[]): Deck[]`
  - `uniqueName(decks: readonly Deck[], name: string): string`
  - `suggestedName(now: Date): string`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/library.test.ts <<'EOF'
import {
  NO_STATS,
  byRecent,
  createDeck,
  findDeck,
  removeDeck,
  renameDeck,
  replaceDeck,
  suggestedName,
  touchDeck,
  uniqueName,
} from '@/core/library';
import type { Deck } from '@/core/library';
import type { Card } from '@/core/deck';

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];
const AT = new Date('2026-09-14T10:00:00Z');

describe('createDeck', () => {
  it('заполняет колоду и ставит обе отметки времени', () => {
    const deck = createDeck('Юнит 1', cards, AT);
    expect(deck.name).toBe('Юнит 1');
    expect(deck.cards).toHaveLength(2);
    expect(deck.createdAt).toBe(AT.toISOString());
    expect(deck.lastOpenedAt).toBe(AT.toISOString());
    expect(deck.session).toBeNull();
    expect(deck.stats).toEqual(NO_STATS);
    expect(deck.direction).toBe('hanzi-to-translation');
    expect(deck.startedMode).toBe('simple');
  });

  it('выдаёт разным колодам разные идентификаторы', () => {
    expect(createDeck('A', cards, AT).id).not.toBe(createDeck('A', cards, AT).id);
  });
});

describe('операции над списком', () => {
  const a = createDeck('A', cards, new Date('2026-09-01T00:00:00Z'));
  const b = createDeck('B', cards, new Date('2026-09-02T00:00:00Z'));

  it('findDeck находит по идентификатору и терпит null', () => {
    expect(findDeck([a, b], b.id)?.name).toBe('B');
    expect(findDeck([a, b], null)).toBeNull();
    expect(findDeck([a, b], 'нет такого')).toBeNull();
  });

  it('replaceDeck меняет колоду на месте, не трогая порядок', () => {
    const changed = { ...a, name: 'A*' };
    const next = replaceDeck([a, b], changed);
    expect(next.map((d) => d.name)).toEqual(['A*', 'B']);
  });

  it('replaceDeck не меняет список, если колоды нет', () => {
    const stranger = createDeck('C', cards, AT);
    expect(replaceDeck([a, b], stranger)).toEqual([a, b]);
  });

  it('renameDeck меняет только имя', () => {
    const next = renameDeck([a, b], a.id, 'Новое');
    expect(next[0]?.name).toBe('Новое');
    expect(next[0]?.cards).toEqual(a.cards);
  });

  it('removeDeck убирает нужную колоду', () => {
    expect(removeDeck([a, b], a.id).map((d) => d.name)).toEqual(['B']);
  });

  it('touchDeck обновляет только lastOpenedAt', () => {
    const later = new Date('2026-09-20T00:00:00Z');
    const next = touchDeck([a, b], a.id, later);
    expect(next[0]?.lastOpenedAt).toBe(later.toISOString());
    expect(next[0]?.createdAt).toBe(a.createdAt);
  });

  it('byRecent ставит недавно открытые первыми', () => {
    expect(byRecent([a, b]).map((d) => d.name)).toEqual(['B', 'A']);
  });

  it('byRecent не меняет исходный список', () => {
    const input = [a, b];
    byRecent(input);
    expect(input.map((d) => d.name)).toEqual(['A', 'B']);
  });
});

describe('uniqueName', () => {
  const a = createDeck('Юнит 1', cards, AT);
  const b = createDeck('Юнит 1 (2)', cards, AT);

  it('свободное имя оставляет как есть', () => {
    expect(uniqueName([a], 'Юнит 2')).toBe('Юнит 2');
  });

  it('занятое имя получает номер', () => {
    expect(uniqueName([a], 'Юнит 1')).toBe('Юнит 1 (2)');
  });

  it('считает дальше, если и номер занят', () => {
    expect(uniqueName([a, b], 'Юнит 1')).toBe('Юнит 1 (3)');
  });
});

describe('suggestedName', () => {
  it('подставляет дату по-русски', () => {
    expect(suggestedName(new Date('2026-09-14T10:00:00Z'))).toBe('Колода от 14 сентября 2026');
  });

  it('работает в январе и декабре', () => {
    expect(suggestedName(new Date('2026-01-01T00:00:00Z'))).toBe('Колода от 1 января 2026');
    expect(suggestedName(new Date('2026-12-31T00:00:00Z'))).toBe('Колода от 31 декабря 2026');
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/library.test.ts
```

Ожидается: FAIL, «Failed to resolve import "@/core/library"».

- [ ] **Step 3: Перенести Stats в session.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
python3 - <<'PY'
import io

# session.ts получает Stats: счётчики принадлежат тренировке, а не хранилищу,
# и из storage.ts они создавали бы цикл импортов с library.ts.
p = 'src/core/session.ts'
s = io.open(p, encoding='utf-8').read()
anchor = "export type SwipeDirection = 'left' | 'right';"
assert s.count(anchor) == 1
s = s.replace(
    anchor,
    "export type SwipeDirection = 'left' | 'right';\n\n"
    "/** Счётчики «знаю» и «не знаю» за тренировку. */\n"
    "export type Stats = { known: number; unknown: number };",
)
io.open(p, 'w', encoding='utf-8').write(s)

# storage.ts больше не объявляет Stats, а берёт его из session.ts
p = 'src/core/storage.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    "import type { Session, SessionMode } from '@/core/session';",
    "import type { Session, SessionMode, Stats } from '@/core/session';",
)
s = s.replace("export type Stats = { known: number; unknown: number };\n\n", "")
io.open(p, 'w', encoding='utf-8').write(s)

# appReducer.ts импортировал Stats из storage.ts
p = 'src/state/appReducer.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    "import type { Session, SessionMode, SwipeDirection } from '@/core/session';",
    "import type { Session, SessionMode, Stats, SwipeDirection } from '@/core/session';",
)
s = s.replace("import type { Stats, StoredState } from '@/core/storage';", "import type { StoredState } from '@/core/storage';")
io.open(p, 'w', encoding='utf-8').write(s)
print('Stats перенесён в session.ts')
PY
grep -rn "Stats" src/core/storage.ts src/core/session.ts src/state/appReducer.ts | head
```

- [ ] **Step 4: Реализовать library.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/library.ts <<'EOF'
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
EOF
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/library.test.ts && npm run lint && npm run typecheck
```

Ожидается: тесты зелёные, ESLint и `tsc` без ошибок.

- [ ] **Step 6: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/core/library.ts src/core/library.test.ts src/core/session.ts src/core/storage.ts src/state/appReducer.ts
git commit -m "feat: add the deck type and library operations

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Хранилище версии 3 и перенос из версии 2

Проверка при чтении отвергает состояние, в котором сессия колоды ссылается на отсутствующую в ней карточку. В Этапе 0 такое состояние давало экран тренировки без карточки и без единой кнопки; правило переносится на каждую колоду отдельно.

**Files:**
- Modify: `src/core/storage.ts`, `src/core/storage.test.ts`

**Interfaces:**
- Consumes: `Deck` из `@/core/library`; `DIRECTIONS` из `@/core/deck`
- Produces:
  - `const STORAGE_KEY = 'flashcards.v3'`, `const STORAGE_VERSION = 3`, `const LEGACY_STORAGE_KEY = 'flashcards.v2'`
  - `type StoredState = { version: 3; decks: Deck[]; activeDeckId: string | null }`
  - `deserialize(raw: string | null): StoredState | null`
  - `migrateFromV2(raw: string | null, now: Date): StoredState | null`
  - `loadState(storage: StorageLike, now: Date): StoredState | null`
  - `saveState(storage: StorageLike, state: StoredState): boolean`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/storage.test.ts <<'EOF'
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  STORAGE_VERSION,
  deserialize,
  loadState,
  migrateFromV2,
  saveState,
} from '@/core/storage';
import type { StorageLike, StoredState } from '@/core/storage';
import type { Deck } from '@/core/library';

const AT = new Date('2026-09-14T10:00:00Z');

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

describe('saveState и loadState', () => {
  it('сохраняет и читает библиотеку без потерь', () => {
    const storage = memoryStorage();
    expect(saveState(storage, valid)).toBe(true);
    expect(loadState(storage, AT)).toEqual(valid);
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
    expect(loadState(failing, AT)).toBeNull();
  });

  it('пустое хранилище даёт null', () => {
    expect(loadState(memoryStorage(), AT)).toBeNull();
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

  it('проверяет ссылки в каждой колоде, а не только в первой', () => {
    const second: Deck = { ...deck, id: 'd2', cards: [], session: { ...deck.session, queue: ['c1'] } };
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
    const { startedMode: _unused, ...withoutMode } = v2;
    expect(migrateFromV2(JSON.stringify(withoutMode), AT)?.decks[0]?.startedMode).toBe('simple');
  });

  it('на отсутствии данных даёт null', () => {
    expect(migrateFromV2(null, AT)).toBeNull();
  });

  it('на битых данных даёт null', () => {
    expect(migrateFromV2('{не json', AT)).toBeNull();
    expect(migrateFromV2(JSON.stringify({ version: 1 }), AT)).toBeNull();
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
    expect(loadState(storage, AT)?.decks).toHaveLength(1);
  });

  it('v3 имеет приоритет над v2', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify(valid),
      [LEGACY_STORAGE_KEY]: JSON.stringify({
        version: 2, cards: [], direction: 'hanzi-to-translation', session: null,
        stats: { known: 0, unknown: 0 },
      }),
    });
    expect(loadState(storage, AT)?.decks[0]?.name).toBe('Юнит 1');
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
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/storage.test.ts
```

Ожидается: FAIL — `migrateFromV2` и `LEGACY_STORAGE_KEY` не экспортируются, `loadState` принимает один аргумент.

- [ ] **Step 3: Реализовать storage.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/storage.ts <<'EOF'
import { DIRECTIONS } from '@/core/deck';
import type { Card, Direction } from '@/core/deck';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import type { Session, SessionMode, Stats } from '@/core/session';
import { suggestedName } from '@/core/library';

export const STORAGE_KEY = 'flashcards.v3';
export const STORAGE_VERSION = 3;

/** Формат Этапа 0. Читается один раз при переносе и никогда не изменяется. */
export const LEGACY_STORAGE_KEY = 'flashcards.v2';

export type StoredState = {
  version: typeof STORAGE_VERSION;
  decks: Deck[];
  activeDeckId: string | null;
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

/** Единственная колода Этапа 0 становится первой колодой библиотеки. */
export function migrateFromV2(raw: string | null, now: Date): StoredState | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== 2) return null;
  if (!Array.isArray(parsed.cards) || !parsed.cards.every(isCard)) return null;
  if (typeof parsed.direction !== 'string' || !DIRECTIONS.includes(parsed.direction as Direction)) {
    return null;
  }
  if (!isStats(parsed.stats)) return null;
  if (parsed.session !== null && !isSession(parsed.session)) return null;

  const deck: Deck = {
    ...createDeck(suggestedName(now), parsed.cards, now),
    direction: parsed.direction as Direction,
    session: parsed.session as Session | null,
    stats: parsed.stats,
    startedMode: parsed.startedMode === 'ring' ? 'ring' : 'simple',
  };
  return { version: STORAGE_VERSION, decks: [deck], activeDeckId: deck.id };
}

export function loadState(storage: StorageLike, now: Date): StoredState | null {
  try {
    const current = deserialize(storage.getItem(STORAGE_KEY));
    if (current !== null) return current;
    return migrateFromV2(storage.getItem(LEGACY_STORAGE_KEY), now);
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

function isMode(value: unknown): value is SessionMode {
  return value === 'simple' || value === 'ring';
}

/** Идентификаторы карточек, на которые ссылается сессия. */
export function sessionCardIds(session: Session): string[] {
  return session.mode === 'ring'
    ? [...session.queue, ...session.blocks.flat()]
    : [...session.queue, ...session.nextRound];
}

function isDeck(value: unknown): value is Deck {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.lastOpenedAt !== 'string' ||
    !Array.isArray(value.cards) ||
    !value.cards.every(isCard) ||
    typeof value.direction !== 'string' ||
    !DIRECTIONS.includes(value.direction as Direction) ||
    !isStats(value.stats) ||
    !isMode(value.startedMode)
  ) {
    return false;
  }

  if (value.session === null) return true;
  if (!isSession(value.session)) return false;

  // Сессия, ссылающаяся на отсутствующую карточку, даёт экран тренировки без
  // карточки и без единой кнопки. Такое состояние отвергается здесь.
  const known = new Set(value.cards.map((card) => card.id));
  return sessionCardIds(value.session).every((id) => known.has(id));
}

function isStoredState(value: unknown): value is StoredState {
  if (
    !isRecord(value) ||
    value.version !== STORAGE_VERSION ||
    !Array.isArray(value.decks) ||
    !value.decks.every(isDeck)
  ) {
    return false;
  }
  if (value.activeDeckId === null) return true;
  if (typeof value.activeDeckId !== 'string') return false;
  return value.decks.some((deck) => deck.id === value.activeDeckId);
}
EOF
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/storage.test.ts src/core/library.test.ts
```

Ожидается: все тесты зелёные. Остальные файлы пока не компилируются — `usePersistence` вызывает `loadState` с одним аргументом; это чинится в задаче 4.

- [ ] **Step 5: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/core/storage.ts src/core/storage.test.ts
git commit -m "feat: store the whole library under one key and migrate v2

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Текст файлов обмена

Модуль готовит и разбирает текст; сохранение файла на диск делает слой представления в задаче 7. `core` не имеет доступа к DOM, и это правило Этапа 0 остаётся в силе.

**Почему проверка файла своя, а не `deserialize`.** Спека требует разного отношения к висячей ссылке сессии: хранилище отвергает состояние целиком, а файл — только сбрасывает сессию, потому что файл приходит от пользователя и терять из-за одной битой сессии всю колоду неправильно. `deserialize` проверку ссылок делает, поэтому через него файл с битой сессией был бы отвергнут целиком и правило спеки стало бы недостижимым: `mergeImportedDecks` до такой колоды просто не дошёл бы. Поэтому проверка формы и проверка ссылок разводятся: `storage.ts` получает `parseDeckList`, который проверяет форму без ссылок, а сброс битой сессии остаётся за `mergeImportedDecks`.

**Files:**
- Create: `src/core/transfer.ts`, `src/core/transfer.test.ts`
- Modify: `src/core/storage.ts`, `src/core/storage.test.ts`

**Interfaces:**
- Consumes: `Deck`, `uniqueName` из `@/core/library`; `newId` из `@/core/id`; `sessionCardIds`, `STORAGE_VERSION`, `parseDeckList` из `@/core/storage`
- Produces:
  - `exportLibraryJson(decks: readonly Deck[]): string`
  - `type ImportResult = { ok: true; decks: Deck[] } | { ok: false; error: string }`
  - `parseLibraryJson(raw: string): ImportResult`
  - `mergeImportedDecks(existing: readonly Deck[], incoming: readonly Deck[]): Deck[]`
  - `exportDeckTable(deck: Deck): string`
  - `libraryFileName(now: Date): string`
  - `deckFileName(deck: Deck): string`

- [ ] **Step 0: Разделить в `storage.ts` проверку формы и проверку ссылок**

Сейчас `isDeck` проверяет и форму колоды, и то, что сессия ссылается только на свои карточки. Файлу обмена нужна первая половина без второй. Разделите функцию и добавьте разбор списка колод.

В `src/core/storage.ts` замените `isDeck` на три функции:

```ts
/** Форма колоды, без проверки ссылок сессии. */
function isDeckShape(value: unknown): value is Deck {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.lastOpenedAt !== 'string' ||
    !Array.isArray(value.cards) ||
    !value.cards.every(isCard) ||
    typeof value.direction !== 'string' ||
    !DIRECTIONS.includes(value.direction as Direction) ||
    !isStats(value.stats) ||
    !isMode(value.startedMode)
  ) {
    return false;
  }
  return value.session === null || isSession(value.session);
}

/** Сессия ссылается только на карточки своей колоды. */
export function sessionFitsDeck(deck: Deck): boolean {
  if (deck.session === null) return true;
  const known = new Set(deck.cards.map((card) => card.id));
  return sessionCardIds(deck.session).every((id) => known.has(id));
}

function isDeck(value: unknown): value is Deck {
  // Сессия, ссылающаяся на отсутствующую карточку, даёт экран тренировки без
  // карточки и без единой кнопки. В хранилище такое состояние отвергается
  // целиком; файл обмена мягче — там сбрасывается только сессия.
  return isDeckShape(value) && sessionFitsDeck(value);
}
```

Рядом с `deserialize` добавьте разбор файла обмена:

```ts
/**
 * Список колод из файла обмена: форма проверяется, ссылки сессий — нет.
 * Их чинит `mergeImportedDecks`, сбрасывая только битую сессию.
 */
export function parseDeckList(raw: string): Deck[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return null;
  if (!Array.isArray(parsed.decks) || !parsed.decks.every(isDeckShape)) return null;
  return parsed.decks;
}
```

Допишите в `src/core/storage.test.ts` блок:

```ts
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
```

Добавьте `parseDeckList` в импорты теста. Прогоните:

```bash
npm run test -- src/core/storage.test.ts && npm run lint
```

Ожидается: всё зелёное. Существующие тесты `deserialize` не меняются — поведение хранилища прежнее.

- [ ] **Step 1: Написать падающие тесты**

Создайте `src/core/transfer.test.ts` со следующим содержимым:

```ts
import {
  deckFileName,
  exportDeckTable,
  exportLibraryJson,
  libraryFileName,
  mergeImportedDecks,
  parseLibraryJson,
} from '@/core/transfer';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import { parseTable } from '@/core/parse';
import type { Card } from '@/core/deck';

const AT = new Date('2026-09-14T10:00:00Z');
const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет, здравствуйте' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

const deck = (name: string, over: Partial<Deck> = {}): Deck => ({
  ...createDeck(name, cards, AT),
  ...over,
});

describe('exportLibraryJson и parseLibraryJson', () => {
  it('выгрузка и загрузка дают ту же библиотеку', () => {
    const decks = [deck('Юнит 1'), deck('Юнит 2')];
    const result = parseLibraryJson(exportLibraryJson(decks));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.decks).toEqual(decks);
  });

  it('в файл не попадает активная колода', () => {
    expect(JSON.parse(exportLibraryJson([deck('Юнит 1')]))).not.toHaveProperty('activeDeckId');
  });

  it('битый JSON даёт понятную ошибку', () => {
    const result = parseLibraryJson('{не json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Файл не похож на сохранённую библиотеку');
  });

  it('чужая структура даёт ошибку', () => {
    const result = parseLibraryJson(JSON.stringify({ version: 99, decks: [] }));
    expect(result.ok).toBe(false);
  });

  // Спека требует, чтобы файл с битой сессией загружался, теряя только сессию.
  // Проверка целиком: разбор не должен отвергнуть такой файл, иначе до сброса
  // сессии в mergeImportedDecks дело не дойдёт.
  it('файл с битой сессией разбирается, и сессия сбрасывается при слиянии', () => {
    const broken = deck('С битой сессией', {
      session: {
        mode: 'simple', round: 1, queue: ['нет такой'], nextRound: [],
        perfectRound: true, finalRound: false, finished: false,
      },
    });
    const result = parseLibraryJson(exportLibraryJson([broken]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const merged = mergeImportedDecks([], result.decks);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.session).toBeNull();
    expect(merged[0]?.cards).toHaveLength(2);
  });
});

describe('mergeImportedDecks', () => {
  it('добавляет колоды к существующим, а не заменяет их', () => {
    const existing = [deck('Старая')];
    const merged = mergeImportedDecks(existing, [deck('Новая')]);
    expect(merged.map((d) => d.name)).toEqual(['Старая', 'Новая']);
  });

  it('совпавшему идентификатору выдаёт новый', () => {
    const existing = [deck('Старая')];
    const clash = { ...deck('Другая'), id: existing[0]!.id };
    const merged = mergeImportedDecks(existing, [clash]);
    expect(merged[1]?.id).not.toBe(existing[0]?.id);
  });

  it('совпавшее имя разводит номером', () => {
    const existing = [deck('Юнит 1')];
    expect(mergeImportedDecks(existing, [deck('Юнит 1')])[1]?.name).toBe('Юнит 1 (2)');
  });

  it('разводит и несколько одинаковых имён в одном файле', () => {
    const existing = [deck('Юнит 1')];
    const merged = mergeImportedDecks(existing, [deck('Юнит 1'), deck('Юнит 1')]);
    expect(merged.map((d) => d.name)).toEqual(['Юнит 1', 'Юнит 1 (2)', 'Юнит 1 (3)']);
  });

  it('сбрасывает сессию со ссылкой на отсутствующую карточку, но колоду оставляет', () => {
    const broken = deck('С битой сессией', {
      session: {
        mode: 'simple', round: 1, queue: ['нет такой'], nextRound: [],
        perfectRound: true, finalRound: false, finished: false,
      },
    });
    const merged = mergeImportedDecks([], [broken]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.session).toBeNull();
    expect(merged[0]?.cards).toHaveLength(2);
  });

  it('годную сессию не трогает', () => {
    const good = deck('С сессией', {
      session: {
        mode: 'simple', round: 1, queue: ['c1', 'c2'], nextRound: [],
        perfectRound: true, finalRound: false, finished: false,
      },
    });
    expect(mergeImportedDecks([], [good])[0]?.session).not.toBeNull();
  });
});

describe('exportDeckTable', () => {
  it('пишет заголовок и строки через табуляцию', () => {
    const lines = exportDeckTable(deck('Юнит 1')).split('\n');
    expect(lines[0]).toBe('иероглиф\tпиньинь\tперевод');
    expect(lines[1]).toBe('你好\tnǐ hǎo\tпривет, здравствуйте');
    expect(lines[2]).toBe('谢谢\txièxie\tспасибо');
  });

  it('результат разбирается обратно существующим parseTable', () => {
    const parsed = parseTable(exportDeckTable(deck('Юнит 1')));
    expect(parsed.addedCount).toBe(2);
    expect(parsed.skippedCount).toBe(0);
    expect(parsed.cards[0]).toMatchObject({
      hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет, здравствуйте',
    });
  });

  it('заменяет табуляции и переводы строк внутри полей на пробел', () => {
    const messy = deck('Грязная', {
      cards: [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ\thǎo', translation: 'привет\nздравствуйте' }],
    });
    const lines = exportDeckTable(messy).split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('你好\tnǐ hǎo\tпривет здравствуйте');
  });
});

describe('имена файлов', () => {
  it('библиотека называется по дате', () => {
    expect(libraryFileName(AT)).toBe('hanzi-cards-2026-09-14.json');
  });

  it('колода называется своим именем', () => {
    expect(deckFileName(deck('Юнит 1'))).toBe('Юнит 1.tsv');
  });

  it('запрещённые в имени файла символы заменяются дефисом', () => {
    expect(deckFileName(deck('HSK 1/2: глаголы?'))).toBe('HSK 1-2- глаголы-.tsv');
  });

  it('имя из одних запрещённых символов превращается в deck', () => {
    expect(deckFileName(deck('///'))).toBe('deck.tsv');
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/core/transfer.test.ts
```

Ожидается: FAIL, «Failed to resolve import "@/core/transfer"».

- [ ] **Step 3: Реализовать transfer.ts**

Создайте `src/core/transfer.ts`:

```ts
import { newId } from '@/core/id';
import { uniqueName } from '@/core/library';
import type { Deck } from '@/core/library';
import { STORAGE_VERSION, parseDeckList, sessionCardIds } from '@/core/storage';

export type ImportResult = { ok: true; decks: Deck[] } | { ok: false; error: string };

const HEADER = 'иероглиф\tпиньинь\tперевод';

/** Запрещённые в именах файлов символы плюс управляющие. */
const UNSAFE_IN_FILE_NAME = /[/\\:*?"<>|\x00-\x1f]/g;

export function exportLibraryJson(decks: readonly Deck[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, decks }, null, 2);
}

export function parseLibraryJson(raw: string): ImportResult {
  // Форма проверяется строго, ссылки сессий — нет: битую сессию сбрасывает
  // mergeImportedDecks, оставляя колоду. Проверь их здесь, файл с одной
  // битой сессией был бы отвергнут целиком, чего спека не хочет.
  const decks = parseDeckList(raw);
  if (decks === null) return { ok: false, error: 'Файл не похож на сохранённую библиотеку' };
  return { ok: true, decks };
}

/**
 * Загруженные колоды добавляются к существующим и никогда их не заменяют:
 * повторная загрузка того же файла даёт второй комплект, а не тихую подмену.
 */
export function mergeImportedDecks(existing: readonly Deck[], incoming: readonly Deck[]): Deck[] {
  const result = [...existing];

  for (const deck of incoming) {
    const takenId = result.some((current) => current.id === deck.id);
    result.push({
      ...deck,
      id: takenId ? newId() : deck.id,
      name: uniqueName(result, deck.name),
      session: keepSessionIfWhole(deck),
    });
  }
  return result;
}

/**
 * Файл приходит от пользователя, и терять из-за одной битой сессии всю колоду
 * неправильно: сбрасывается только сессия. Хранилище в том же случае отвергает
 * состояние целиком — там источник свой, и битая ссылка означает поломку.
 */
function keepSessionIfWhole(deck: Deck): Deck['session'] {
  if (deck.session === null) return null;
  const known = new Set(deck.cards.map((card) => card.id));
  return sessionCardIds(deck.session).every((id) => known.has(id)) ? deck.session : null;
}

export function exportDeckTable(deck: Deck): string {
  const rows = deck.cards.map((card) =>
    [card.hanzi, card.pinyin, card.translation].map(flatten).join('\t'),
  );
  return [HEADER, ...rows].join('\n');
}

/** Табуляция и перевод строки внутри поля разорвали бы строку таблицы. */
function flatten(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ');
}

export function libraryFileName(now: Date): string {
  const date = now.toISOString().slice(0, 10);
  return `hanzi-cards-${date}.json`;
}

export function deckFileName(deck: Deck): string {
  const safe = deck.name.replace(UNSAFE_IN_FILE_NAME, '-').trim();
  return `${safe === '' ? 'deck' : safe}.tsv`;
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
npm run test -- src/core/transfer.test.ts src/core/storage.test.ts
```

Ожидается: все тесты зелёные в обоих файлах.

- [ ] **Step 5: Проверить линтер**

```bash
npm run lint
```

Ожидается: без ошибок. Если ESLint ругается на `existing[0]!.id` в тесте, замените на `existing[0]?.id ?? ''` — правило запрета ненулевого утверждения включено не во всех конфигурациях, но тест не должен от него зависеть.

- [ ] **Step 6: Коммит**

```bash
git add src/core/transfer.ts src/core/transfer.test.ts src/core/storage.ts src/core/storage.test.ts
git commit -m "feat: build and parse the library and deck exchange files

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Переход состояния на библиотеку

Самая крупная задача и единственная неделимая: изменение формы `AppState` ломает компиляцию всех экранов сразу, поэтому они правятся тем же коммитом. Библиотека здесь появляется в минимальном виде — список имён и кнопка добавления; переименование, удаление и выгрузка приходят в задаче 5.

**Files:**
- Modify: `src/state/appReducer.ts`, `src/state/appReducer.test.ts`, `src/state/AppContext.tsx`, `src/hooks/usePersistence.ts`, `src/hooks/usePersistence.test.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/screens/ModeScreen.tsx`, `src/screens/ResumeScreen.tsx`, `src/screens/TrainingScreen.tsx`, `src/screens/DoneScreen.tsx`, `src/screens/ImportScreen.tsx`
- Create: `src/screens/LibraryScreen.tsx`

**Interfaces:**
- Consumes: всё из задач 1–3
- Produces:
  - `type Screen = 'library' | 'import' | 'resume' | 'mode' | 'training' | 'done'`
  - `type AppState = { decks: Deck[]; activeDeckId: string | null; screen: Screen; hydrated: boolean; storageFailed: boolean }`
  - `activeDeck(state: AppState): Deck | null`
  - `useActiveDeck(): Deck | null` из `@/state/AppContext`
  - компонент `LibraryScreen` без свойств

- [ ] **Step 1: Написать падающие тесты редьюсера**

Замените `src/state/appReducer.test.ts` целиком:

```ts
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

  it('storage-failed поднимает флаг', () => {
    expect(appReducer(initialState, { type: 'storage-failed' }).storageFailed).toBe(true);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/state/appReducer.test.ts
```

Ожидается: FAIL — `activeDeck` не экспортируется, действия `deck-created` и остальные неизвестны.

- [ ] **Step 3: Переписать appReducer.ts**

Замените `src/state/appReducer.ts` целиком:

```ts
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
```

- [ ] **Step 4: Убедиться, что тесты редьюсера проходят**

```bash
npm run test -- src/state/appReducer.test.ts
```

Ожидается: все тесты зелёные. Остальные файлы пока не компилируются — это чинится следующими шагами.

- [ ] **Step 5: Добавить хук активной колоды**

В `src/state/AppContext.tsx` допишите после `useAppDispatch`:

```tsx
export function useActiveDeck(): Deck | null {
  return activeDeck(useAppState());
}
```

и дополните импорты в начале файла:

```tsx
import { activeDeck, appReducer, initialState } from '@/state/appReducer';
import type { AppAction, AppState } from '@/state/appReducer';
import type { Deck } from '@/core/library';
```

- [ ] **Step 6: Приспособить сохранение состояния**

В `src/hooks/usePersistence.ts` замените тело обоих эффектов:

```ts
  useEffect(() => {
    if (loadAttempted.current) return;
    loadAttempted.current = true;

    const restored = storage === null ? null : loadState(storage, new Date());
    if (restored === null) {
      dispatch({ type: 'hydration-finished' });
      return;
    }
    dispatch({ type: 'restore', stored: restored });
  }, [dispatch, storage]);

  useEffect(() => {
    // Запись до гидратации затёрла бы сохранённую библиотеку пустой начальной.
    if (!state.hydrated || storage === null) return;

    const saved = saveState(storage, {
      version: STORAGE_VERSION,
      decks: state.decks,
      activeDeckId: state.activeDeckId,
    });
    if (!saved && !state.storageFailed) {
      dispatch({ type: 'storage-failed' });
    }
  }, [state.hydrated, state.decks, state.activeDeckId, state.storageFailed, dispatch, storage]);
```

- [ ] **Step 7: Создать минимальный экран библиотеки**

```bash
cat > src/screens/LibraryScreen.tsx <<'EOF'
import { byRecent } from '@/core/library';
import { cardsCount } from '@/core/plural';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function LibraryScreen() {
  const { decks } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <section className="screen">
      <h1>Мои колоды</h1>

      <div className="library">
        <div className="library__bar">
          <button type="button" className="btn" onClick={() => dispatch({ type: 'go-to-import' })}>
            Добавить колоду
          </button>
        </div>

        {decks.length === 0 ? (
          <p className="library__empty">
            Пока ни одной колоды. Добавьте первую — вставьте таблицу со словами.
          </p>
        ) : (
          <ul className="library__list">
            {byRecent(decks).map((deck) => (
              <li key={deck.id}>
                <button
                  type="button"
                  className="deck-row"
                  onClick={() => dispatch({ type: 'deck-opened', id: deck.id, now: new Date() })}
                >
                  <span className="deck-row__main">
                    <span className="deck-row__name">{deck.name}</span>
                    <span className="deck-row__meta">
                      {cardsCount(deck.cards.length)}
                      {deck.session !== null && !deck.session.finished && (
                        <span className="deck-row__unfinished"> · тренировка не закончена</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
EOF
```

- [ ] **Step 8: Приспособить пять экранов и App.tsx**

Каждый экран получает колоду через `useActiveDeck` и возвращает `null`, если её нет.

```bash
python3 - <<'PY'
import io

def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, '%s: не найдено %r' % (path, old[:60])
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8').write(s)

patch('src/screens/ModeScreen.tsx', [
    ("import { useAppDispatch, useAppState } from '@/state/AppContext';",
     "import { useActiveDeck, useAppDispatch } from '@/state/AppContext';"),
    ("  const { cards, direction } = useAppState();\n  const dispatch = useAppDispatch();",
     "  const deck = useActiveDeck();\n  const dispatch = useAppDispatch();\n  if (deck === null) return null;\n  const { cards, direction } = deck;"),
    # Без этой ссылки из выбора режима в библиотеку не попасть иначе как
    # через импорт с последующей отменой.
    ("      <button type=\"button\" className=\"link-button\" onClick={() => dispatch({ type: 'go-to-import' })}>\n        Загрузить новую таблицу\n      </button>",
     "      <div className=\"mode__links\">\n"
     "        <button type=\"button\" className=\"link-button\" onClick={() => dispatch({ type: 'go-to-library' })}>\n"
     "          В библиотеку\n"
     "        </button>\n"
     "        <button type=\"button\" className=\"link-button\" onClick={() => dispatch({ type: 'go-to-import' })}>\n"
     "          Загрузить новую таблицу\n"
     "        </button>\n"
     "      </div>"),
])

patch('src/screens/ResumeScreen.tsx', [
    ("import { useAppDispatch, useAppState } from '@/state/AppContext';",
     "import { useActiveDeck, useAppDispatch } from '@/state/AppContext';"),
    ("  const { cards, session } = useAppState();",
     "  const deck = useActiveDeck();"),
    ("  if (session === null) return null;",
     "  if (deck === null || deck.session === null) return null;\n  const { cards, session } = deck;"),
])

patch('src/screens/TrainingScreen.tsx', [
    ("import { useAppDispatch, useAppState } from '@/state/AppContext';",
     "import { useActiveDeck, useAppDispatch } from '@/state/AppContext';"),
    ("  const { cards, direction, session, stats } = useAppState();",
     "  const deck = useActiveDeck();\n  const cards = deck?.cards ?? [];\n  const direction = deck?.direction ?? 'hanzi-to-translation';\n  const session = deck?.session ?? null;\n  const stats = deck?.stats ?? { known: 0, unknown: 0 };"),
])

patch('src/screens/DoneScreen.tsx', [
    ("import { useAppDispatch, useAppState } from '@/state/AppContext';",
     "import { useActiveDeck, useAppDispatch } from '@/state/AppContext';"),
    ("  const { cards, stats, startedMode } = useAppState();\n  const dispatch = useAppDispatch();",
     "  const deck = useActiveDeck();\n  const dispatch = useAppDispatch();\n  if (deck === null) return null;\n  const { cards, stats, startedMode } = deck;"),
    ("          onClick={() => dispatch({ type: 'go-to-mode' })}\n        >\n          В меню",
     "          onClick={() => dispatch({ type: 'go-to-library' })}\n        >\n          В библиотеку"),
])

patch('src/screens/ImportScreen.tsx', [
    ("  const { cards, session } = useAppState();",
     "  const { decks } = useAppState();\n  const deck = useActiveDeck();\n  const session = deck?.session ?? null;"),
    ("import { useAppDispatch, useAppState } from '@/state/AppContext';",
     "import { useActiveDeck, useAppDispatch, useAppState } from '@/state/AppContext';"),
    ("import { assignIds } from '@/core/deck';",
     "import { assignIds } from '@/core/deck';\nimport { suggestedName } from '@/core/library';"),
    ("        onClick={() => dispatch({ type: 'deck-imported', cards: assignIds(result.cards) })}",
     "        onClick={() =>\n          dispatch({\n            type: 'deck-created',\n            name: suggestedName(new Date()),\n            cards: assignIds(result.cards),\n            now: new Date(),\n          })\n        }"),
    ("      {cards.length > 0 && (", "      {decks.length > 0 && ("),
])

patch('src/App.tsx', [
    ("import ImportScreen from '@/screens/ImportScreen';",
     "import ImportScreen from '@/screens/ImportScreen';\nimport LibraryScreen from '@/screens/LibraryScreen';"),
    ("  switch (screen) {\n    case 'resume':",
     "  switch (screen) {\n    case 'library':\n      return <LibraryScreen />;\n    case 'resume':"),
])
print('экраны приспособлены')
PY
npm run typecheck
```

Ожидается: `tsc` без ошибок. Если ругается на неиспользованный импорт `useAppState` в каком-то экране — уберите его.

- [ ] **Step 9: Починить тесты экранов**

Помощники в тестах строят состояние старой формы. Меняется только они — смысл проверок остаётся прежним.

```bash
python3 - <<'PY'
import io

def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, '%s: не найдено %r' % (path, old[:60])
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8').write(s)

DECK_IMPORTS = (
    "import { initialState } from '@/state/appReducer';\n"
    "import type { AppState } from '@/state/appReducer';\n"
    "import { createDeck } from '@/core/library';\n"
    "import type { Deck } from '@/core/library';\n"
    "\nconst AT = new Date('2026-09-14T10:00:00Z');\n"
)

patch('src/screens/ModeScreen.test.tsx', [
    ("import { initialState } from '@/state/appReducer';\nimport type { AppState } from '@/state/appReducer';",
     DECK_IMPORTS.rstrip('\n')),
    ("function stateWith(overrides: Partial<AppState> = {}): AppState {\n"
     "  return { ...initialState, cards, hydrated: true, screen: 'mode', ...overrides };\n}",
     "function stateWith(overrides: Partial<Deck> = {}): AppState {\n"
     "  const deck = { ...createDeck('Тестовая колода', cards, AT), ...overrides };\n"
     "  return { ...initialState, hydrated: true, decks: [deck], activeDeckId: deck.id, screen: 'mode' };\n}"),
])

patch('src/screens/ResumeScreen.test.tsx', [
    ("import { initialState } from '@/state/appReducer';\nimport type { AppState } from '@/state/appReducer';",
     DECK_IMPORTS.rstrip('\n')),
    ("function resumeState(mode: 'simple' | 'ring' = 'simple'): AppState {\n"
     "  return {\n    ...initialState,\n    cards,\n    hydrated: true,\n    screen: 'resume',\n"
     "    startedMode: mode,\n    session: createSession(['c1', 'c2'], mode),\n  };\n}",
     "function resumeState(mode: 'simple' | 'ring' = 'simple'): AppState {\n"
     "  const deck: Deck = {\n    ...createDeck('Тестовая колода', cards, AT),\n"
     "    startedMode: mode,\n    session: createSession(['c1', 'c2'], mode),\n  };\n"
     "  return { ...initialState, hydrated: true, decks: [deck], activeDeckId: deck.id, screen: 'resume' };\n}"),
])

patch('src/screens/TrainingScreen.test.tsx', [
    ("import { initialState } from '@/state/appReducer';\nimport type { AppState } from '@/state/appReducer';",
     DECK_IMPORTS.rstrip('\n')),
    ("function trainingState(mode: 'simple' | 'ring' = 'simple'): AppState {\n"
     "  return {\n    ...initialState,\n    cards,\n    hydrated: true,\n    screen: 'training',\n"
     "    startedMode: mode,\n    session: createSession(['c1', 'c2'], mode),\n  };\n}",
     "function trainingState(mode: 'simple' | 'ring' = 'simple'): AppState {\n"
     "  const deck: Deck = {\n    ...createDeck('Тестовая колода', cards, AT),\n"
     "    startedMode: mode,\n    session: createSession(['c1', 'c2'], mode),\n  };\n"
     "  return { ...initialState, hydrated: true, decks: [deck], activeDeckId: deck.id, screen: 'training' };\n}"),
])
print('помощники тестов переведены на колоду')
PY
```

Тест TrainingScreen «показывает выход, если карточка сессии не найдена» строил состояние как `{ ...trainingState(), cards: [] }`. Теперь пустой список карточек живёт в колоде — замените это выражение на:

```ts
    const state = trainingState();
    const deck = state.decks[0];
    if (deck === undefined) throw new Error('колода не собрана');
    renderWithProvider(<TrainingScreen />, {
      ...state,
      decks: [{ ...deck, cards: [] }],
    });
```

Тест TrainingScreen «учитывает направление при отрисовке» менял направление в корне состояния. Замените на:

```ts
    const state = trainingState();
    const deck = state.decks[0];
    if (deck === undefined) throw new Error('колода не собрана');
    renderWithProvider(<TrainingScreen />, {
      ...state,
      decks: [{ ...deck, direction: 'translation-to-hanzi' }],
    });
```

- [ ] **Step 10: Починить тесты приложения**

`src/App.test.tsx` собирал состояние формата версии 2 и проверял поток без библиотеки. Три сценария меняют смысл.

Замените блок `const stored: StoredState = { ... }` в тесте «сохранённая сессия приводит на экран возобновления» на библиотеку из одной колоды, а сам тест — на путь через библиотеку: восстановление теперь ведёт в список, а возобновление появляется после открытия колоды.

```ts
  it('сохранённая сессия видна в библиотеке и открывается на возобновлении', async () => {
    const user = userEvent.setup();
    const deck: Deck = {
      ...createDeck('Юнит 1', [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' }], AT),
      session: {
        mode: 'simple', round: 1, queue: ['c1'], nextRound: [],
        perfectRound: true, finalRound: false, finished: false,
      },
    };
    const stored: StoredState = { version: STORAGE_VERSION, decks: [deck], activeDeckId: deck.id };
    const { storage } = memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
    render(<App storage={storage} />);

    expect(screen.getByRole('heading', { name: 'Мои колоды' })).toBeInTheDocument();
    expect(screen.getByText('тренировка не закончена', { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Юнит 1/ }));
    expect(screen.getByRole('heading', { name: 'Продолжить тренировку?' })).toBeInTheDocument();
  });
```

Тест «отмена импорта возвращает в тренировку и сохраняет прогресс» переименуйте и перепишите: отмена теперь возвращает в библиотеку, а сохранность прогресса проверяется открытием колоды.

```ts
  it('отмена импорта не трогает начатую тренировку', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByRole('button', { name: 'Простой просмотр' }));
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');

    await user.click(screen.getByRole('button', { name: 'Загрузить новую таблицу' }));
    await user.click(screen.getByRole('button', { name: 'Отменить' }));
    expect(screen.getByRole('heading', { name: 'Мои колоды' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /карточк/ }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(screen.getByText('谢谢')).toBeInTheDocument();
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
  });
```

Добавьте недостающие импорты в начало `src/App.test.tsx`:

```ts
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';

const AT = new Date('2026-09-14T10:00:00Z');
```

Остальные сценарии App.test.tsx работают без изменений: `importDeck` по-прежнему заканчивается на экране выбора режима, потому что `deck-created` ведёт именно туда.

- [ ] **Step 10a: Дополнить предупреждение об отказе записи**

При переполнении квоты выгрузка в файл — единственный способ не потерять колоды, и предупреждение обязано об этом сказать. В `src/App.tsx` замените текст:

```tsx
        <p className="warning" role="status">
          Прогресс не сохраняется: браузер не разрешает запись. Сохраните
          библиотеку в файл, чтобы не потерять колоды.
        </p>
```

Соответствующую проверку в `src/App.test.tsx` приведите к новому тексту:

```tsx
    expect(
      screen.getByText('Прогресс не сохраняется', { exact: false }),
    ).toBeInTheDocument();
```

- [ ] **Step 11: Прогнать всё**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Ожидается: всё зелёное.

- [ ] **Step 12: Коммит**

```bash
git add -A
git commit -m "feat: move training state into decks and add a library screen

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Строка колоды и стили библиотеки

Переименование и подтверждение удаления живут внутри строки, а не в модальном окне: приём уже работает на экране возобновления, и повторять его дешевле, чем заводить второй механизм. CSS переносится из согласованного `mockups.html`.

**Files:**
- Create: `src/components/DeckRow.tsx`, `src/components/DeckRow.test.tsx`
- Modify: `src/screens/LibraryScreen.tsx`, `src/styles/app.css`

**Interfaces:**
- Consumes: `Deck` из `@/core/library`; `cardsCount` из `@/core/plural`
- Produces: компонент `DeckRow` со свойствами `{ deck: Deck; onOpen: () => void; onRename: (name: string) => void; onDelete: () => void; onExport: () => void }`

- [ ] **Step 1: Написать падающие тесты**

Создайте `src/components/DeckRow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeckRow from '@/components/DeckRow';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import { createSession } from '@/core/session';
import type { Card } from '@/core/deck';

const AT = new Date('2026-09-14T10:00:00Z');
const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function renderRow(overrides: Partial<Deck> = {}) {
  const deck = { ...createDeck('Юнит 1', cards, AT), ...overrides };
  const handlers = {
    onOpen: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onExport: vi.fn(),
  };
  render(<DeckRow deck={deck} {...handlers} />);
  return handlers;
}

describe('DeckRow', () => {
  it('показывает имя и число карточек', () => {
    renderRow();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
    expect(screen.getByText('2 карточки', { exact: false })).toBeInTheDocument();
  });

  it('помечает незавершённую тренировку', () => {
    renderRow({ session: createSession(['c1', 'c2'], 'simple') });
    expect(screen.getByText('тренировка не закончена', { exact: false })).toBeInTheDocument();
  });

  it('без сессии пометки нет', () => {
    renderRow();
    expect(screen.queryByText('тренировка не закончена', { exact: false })).not.toBeInTheDocument();
  });

  it('нажатие на строку открывает колоду', async () => {
    const user = userEvent.setup();
    const { onOpen } = renderRow();
    await user.click(screen.getByRole('button', { name: /Юнит 1/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('переименование отдаёт новое имя', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать' }));

    const field = screen.getByLabelText('Название колоды');
    await user.clear(field);
    await user.type(field, 'Другое имя');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onRename).toHaveBeenCalledWith('Другое имя');
  });

  it('переименование можно отменить', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать' }));
    await user.click(screen.getByRole('button', { name: 'отмена' }));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
  });

  it('пустое имя не сохраняется', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать' }));
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onRename).not.toHaveBeenCalled();
  });

  it('удаление требует подтверждения', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderRow();
    await user.click(screen.getByRole('button', { name: 'удалить' }));

    expect(screen.getByText('Удалить вместе с прогрессом?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('подтверждение удаления можно отменить', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderRow();
    await user.click(screen.getByRole('button', { name: 'удалить' }));
    await user.click(screen.getByRole('button', { name: 'отмена' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Удалить вместе с прогрессом?')).not.toBeInTheDocument();
  });

  it('выгрузка вызывается сразу', async () => {
    const user = userEvent.setup();
    const { onExport } = renderRow();
    await user.click(screen.getByRole('button', { name: 'выгрузить' }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/components/DeckRow.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/components/DeckRow"».

- [ ] **Step 3: Реализовать DeckRow.tsx**

```tsx
import { useState } from 'react';
import type { Deck } from '@/core/library';
import { cardsCount } from '@/core/plural';

type DeckRowProps = {
  deck: Deck;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onExport: () => void;
};

type Mode = 'view' | 'rename' | 'confirm-delete';

export default function DeckRow({ deck, onOpen, onRename, onDelete, onExport }: DeckRowProps) {
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState(deck.name);
  const unfinished = deck.session !== null && !deck.session.finished;

  if (mode === 'rename') {
    return (
      <div className="deck-row">
        <label className="library__rename-label">
          <span className="visually-hidden">Название колоды</span>
          <input
            className="library__rename"
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <div className="deck-row__actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              // Пустое имя не сохраняем: строка без имени неотличима от соседних.
              if (draft.trim() === '') return;
              onRename(draft.trim());
              setMode('view');
            }}
          >
            Сохранить
          </button>
          <button type="button" className="link-button" onClick={() => setMode('view')}>
            отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-row-wrap">
      <button type="button" className="deck-row" onClick={onOpen}>
        <span className="deck-row__main">
          <span className="deck-row__name">{deck.name}</span>
          <span className="deck-row__meta">
            {cardsCount(deck.cards.length)}
            {unfinished && (
              <span className="deck-row__unfinished"> · тренировка не закончена</span>
            )}
          </span>
        </span>
      </button>

      {mode === 'confirm-delete' ? (
        <div className="deck-row__confirm">
          <p>Удалить вместе с прогрессом?</p>
          <button type="button" className="btn" onClick={onDelete}>
            Удалить
          </button>
          <button type="button" className="link-button" onClick={() => setMode('view')}>
            отмена
          </button>
        </div>
      ) : (
        <div className="deck-row__actions">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setDraft(deck.name);
              setMode('rename');
            }}
          >
            переименовать
          </button>
          <button type="button" className="link-button" onClick={onExport}>
            выгрузить
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => setMode('confirm-delete')}
          >
            удалить
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Перенести стили из макета**

Допишите в конец `src/styles/app.css`:

```css
.library {
  width: min(90vw, 48rem);
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.library__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.library__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.deck-row-wrap {
  display: flex;
  align-items: center;
  gap: var(--gap);
  background: var(--surface);
  border: 1px solid transparent;
  border-radius: var(--radius);
  padding: 0 var(--gap) 0 0;
}

.deck-row-wrap:hover {
  border-color: var(--accent);
}

.deck-row {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--gap);
  padding: 0.9rem var(--gap);
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  text-align: left;
}

.deck-row__main {
  flex: 1;
  min-width: 0;
  display: block;
}

.deck-row__name {
  display: block;
  font-size: 1.25rem;
}

.deck-row__meta {
  display: block;
  margin-top: 0.15rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.deck-row__unfinished {
  color: var(--accent);
}

.deck-row__actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.deck-row__actions .link-button {
  font-size: 0.9rem;
}

.deck-row__confirm {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.deck-row__confirm p {
  margin: 0;
  color: var(--no);
}

.library__empty {
  margin: 0;
  color: var(--text-muted);
  text-align: center;
}

.library__rename-label {
  flex: 1;
  display: flex;
  padding: 0.9rem 0 0.9rem var(--gap);
}

.library__rename {
  flex: 1;
  font: inherit;
  font-size: 1.25rem;
  padding: 0.35rem 0.5rem;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: 8px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* На узком экране строка не помещается в один ряд: имя начинает переноситься
   по словам в столбик, а действия налезают на текст. */
@media (max-width: 40rem) {
  .deck-row-wrap {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
    padding: 0 var(--gap) 0.9rem;
  }

  .deck-row {
    padding-left: 0;
    padding-bottom: 0;
  }

  .deck-row__actions,
  .deck-row__confirm {
    flex-wrap: wrap;
  }

  .library__rename-label {
    padding-left: 0;
  }
}

.mode__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  justify-content: center;
}
```

- [ ] **Step 5: Подключить строку к экрану библиотеки**

Замените список в `src/screens/LibraryScreen.tsx` на использование `DeckRow`. Полный файл появится в задаче 6; сейчас достаточно заменить содержимое `<li>`:

```tsx
              <li key={deck.id}>
                <DeckRow
                  deck={deck}
                  onOpen={() => dispatch({ type: 'deck-opened', id: deck.id, now: new Date() })}
                  onRename={(name) => dispatch({ type: 'deck-renamed', id: deck.id, name })}
                  onDelete={() => dispatch({ type: 'deck-deleted', id: deck.id })}
                  onExport={() => undefined}
                />
              </li>
```

и добавьте импорт `import DeckRow from '@/components/DeckRow';`. Обработчик выгрузки пока пустой — он появится в задаче 6.

- [ ] **Step 6: Прогнать проверки**

```bash
npm run test && npm run lint && npm run typecheck
```

Ожидается: всё зелёное.

- [ ] **Step 7: Коммит**

```bash
git add src/components/DeckRow.tsx src/components/DeckRow.test.tsx src/screens/LibraryScreen.tsx src/styles/app.css
git commit -m "feat: rename and delete decks from the library row

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Обмен файлами

Сохранение файла — единственное место, где обмен трогает DOM, поэтому оно живёт в слое представления, а не в `core`.

**Files:**
- Create: `src/lib/download.ts`
- Modify: `src/screens/LibraryScreen.tsx`, `src/screens/LibraryScreen.test.tsx` (создать), `src/styles/app.css`

**Interfaces:**
- Consumes: `exportLibraryJson`, `parseLibraryJson`, `mergeImportedDecks`, `exportDeckTable`, `libraryFileName`, `deckFileName` из `@/core/transfer`
- Produces: `downloadText(fileName: string, text: string, mime: string): void`

- [ ] **Step 1: Написать падающие тесты экрана**

Создайте `src/screens/LibraryScreen.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryScreen from '@/screens/LibraryScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import { createDeck } from '@/core/library';
import type { Card } from '@/core/deck';

const AT = new Date('2026-09-14T10:00:00Z');
const LATER = new Date('2026-09-20T10:00:00Z');
const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

const downloads: Array<{ fileName: string; text: string }> = [];
vi.mock('@/lib/download', () => ({
  downloadText: (fileName: string, text: string) => {
    downloads.push({ fileName, text });
  },
}));

function withDecks(): AppState {
  const first = createDeck('Юнит 1', cards, AT);
  const second = createDeck('Юнит 2', cards, LATER);
  return { ...initialState, hydrated: true, decks: [first, second], activeDeckId: null, screen: 'library' };
}

describe('LibraryScreen', () => {
  beforeEach(() => {
    downloads.length = 0;
  });

  it('пустая библиотека предлагает добавить первую колоду', () => {
    renderWithProvider(<LibraryScreen />, { ...initialState, hydrated: true, screen: 'library' });
    expect(screen.getByText('Пока ни одной колоды', { exact: false })).toBeInTheDocument();
  });

  it('показывает колоды, недавно открытые первыми', () => {
    renderWithProvider(<LibraryScreen />, withDecks());
    const names = screen.getAllByRole('button', { name: /Юнит/ }).map((node) => node.textContent);
    expect(names[0]).toContain('Юнит 2');
    expect(names[1]).toContain('Юнит 1');
  });

  it('сохранение библиотеки отдаёт файл с обеими колодами', async () => {
    const user = userEvent.setup();
    renderWithProvider(<LibraryScreen />, withDecks());
    await user.click(screen.getByRole('button', { name: 'Сохранить в файл' }));

    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.fileName).toMatch(/^hanzi-cards-\d{4}-\d{2}-\d{2}\.json$/);
    const parsed = JSON.parse(downloads[0]?.text ?? '{}');
    expect(parsed.decks).toHaveLength(2);
  });

  it('выгрузка колоды отдаёт таблицу с её именем', async () => {
    const user = userEvent.setup();
    renderWithProvider(<LibraryScreen />, withDecks());
    const rows = screen.getAllByRole('button', { name: 'выгрузить' });
    await user.click(rows[0] as HTMLElement);

    expect(downloads[0]?.fileName).toBe('Юнит 2.tsv');
    expect(downloads[0]?.text.split('\n')[0]).toBe('иероглиф\tпиньинь\tперевод');
  });

  it('пустая библиотека не предлагает сохранение', () => {
    renderWithProvider(<LibraryScreen />, { ...initialState, hydrated: true, screen: 'library' });
    expect(screen.queryByRole('button', { name: 'Сохранить в файл' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/screens/LibraryScreen.test.tsx
```

Ожидается: FAIL — модуль `@/lib/download` не существует, кнопок сохранения и выгрузки на экране нет.

- [ ] **Step 3: Реализовать сохранение файла**

```bash
mkdir -p src/lib
cat > src/lib/download.ts <<'EOF'
/**
 * Сохранение текста в файл. Живёт вне core: там нет доступа к DOM, и это
 * правило проверяется линтером.
 */
export function downloadText(fileName: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  // Без отзыва ссылка держит содержимое файла в памяти до перезагрузки вкладки.
  URL.revokeObjectURL(url);
}
EOF
```

- [ ] **Step 4: Дописать экран библиотеки**

Замените `src/screens/LibraryScreen.tsx` целиком:

```tsx
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import DeckRow from '@/components/DeckRow';
import { byRecent } from '@/core/library';
import {
  deckFileName,
  exportDeckTable,
  exportLibraryJson,
  libraryFileName,
  mergeImportedDecks,
  parseLibraryJson,
} from '@/core/transfer';
import { downloadText } from '@/lib/download';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function LibraryScreen() {
  const { decks } = useAppState();
  const dispatch = useAppDispatch();
  const [fileError, setFileError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = parseLibraryJson(String(reader.result ?? ''));
      if (!result.ok) {
        setFileError(result.error);
        return;
      }
      setFileError('');
      dispatch({ type: 'decks-imported', decks: mergeImportedDecks(decks, result.decks) });
    };
    // Молча оставлять пустой экран нельзя: со стороны это выглядит как ничего.
    reader.onerror = () => setFileError(`Не удалось прочитать файл «${file.name}»`);
    reader.readAsText(file);
  }

  return (
    <section className="screen">
      <h1>Мои колоды</h1>

      <div className="library">
        <div className="library__bar">
          <button type="button" className="btn" onClick={() => dispatch({ type: 'go-to-import' })}>
            Добавить колоду
          </button>
          {decks.length > 0 && (
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() =>
                downloadText(
                  libraryFileName(new Date()),
                  exportLibraryJson(decks),
                  'application/json',
                )
              }
            >
              Сохранить в файл
            </button>
          )}
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => fileInput.current?.click()}
          >
            Загрузить из файла
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleFile}
          />
        </div>

        {fileError !== '' && <p className="import__error">{fileError}</p>}

        {decks.length === 0 ? (
          <p className="library__empty">
            Пока ни одной колоды. Добавьте первую — вставьте таблицу со словами.
          </p>
        ) : (
          <ul className="library__list">
            {byRecent(decks).map((deck) => (
              <li key={deck.id}>
                <DeckRow
                  deck={deck}
                  onOpen={() => dispatch({ type: 'deck-opened', id: deck.id, now: new Date() })}
                  onRename={(name) => dispatch({ type: 'deck-renamed', id: deck.id, name })}
                  onDelete={() => dispatch({ type: 'deck-deleted', id: deck.id })}
                  onExport={() =>
                    downloadText(deckFileName(deck), exportDeckTable(deck), 'text/tab-separated-values')
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Прогнать проверки**

```bash
npm run test && npm run lint && npm run typecheck && npm run build
```

Ожидается: всё зелёное.

- [ ] **Step 6: Коммит**

```bash
git add src/lib/download.ts src/screens/LibraryScreen.tsx src/screens/LibraryScreen.test.tsx
git commit -m "feat: save the library to a file and load it back

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Имя колоды на экране импорта

**Files:**
- Modify: `src/screens/ImportScreen.tsx`, `src/screens/ImportScreen.test.tsx`, `src/styles/app.css`

**Interfaces:**
- Consumes: `suggestedName` из `@/core/library`
- Produces: ничего нового наружу

- [ ] **Step 1: Написать падающие тесты**

Допишите в `src/screens/ImportScreen.test.tsx`:

```tsx
  it('подставляет имя-подсказку', () => {
    renderWithProvider(<ImportScreen />);
    const field = screen.getByLabelText('Название колоды');
    expect((field as HTMLInputElement).value.startsWith('Колода от')).toBe(true);
  });

  it('имя файла становится подсказкой', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);

    const file = new File(['你好\tni3 hao3\tпривет'], 'Юнит 5.tsv', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('Файл с таблицей'), file);

    expect(await screen.findByDisplayValue('Юнит 5')).toBeInTheDocument();
  });

  it('введённое имя не затирается подсказкой из файла', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);

    const field = screen.getByLabelText('Название колоды');
    await user.clear(field);
    await user.type(field, 'Моё имя');

    const file = new File(['你好\tni3 hao3\tпривет'], 'Юнит 5.tsv', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('Файл с таблицей'), file);

    expect(field).toHaveValue('Моё имя');
  });
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/screens/ImportScreen.test.tsx
```

Ожидается: FAIL — поля с подписью «Название колоды» на экране нет.

- [ ] **Step 3: Добавить поле имени**

```bash
python3 - <<'PY'
import io
p = 'src/screens/ImportScreen.tsx'
s = io.open(p, encoding='utf-8').read()

pairs = [
    # Состояние имени: пустая строка означает «взять подсказку».
    ("  const [fileError, setFileError] = useState('');",
     "  const [fileError, setFileError] = useState('');\n"
     "  const [name, setName] = useState(() => suggestedName(new Date()));\n"
     "  const [nameTouched, setNameTouched] = useState(false);"),

    # Имя файла становится подсказкой, но только если пользователь не вводил своё.
    ("    reader.onload = () => {\n      setFileError('');\n      setText(String(reader.result ?? ''));\n    };",
     "    reader.onload = () => {\n      setFileError('');\n      setText(String(reader.result ?? ''));\n"
     "      if (!nameTouched) setName(file.name.replace(/\\.[^.]+$/, ''));\n    };"),

    ("      <h1>Вставьте таблицу со словами</h1>",
     "      <h1>Новая колода</h1>\n\n"
     "      <label className=\"import__name\">\n"
     "        <span>Название колоды</span>\n"
     "        <input\n"
     "          value={name}\n"
     "          onChange={(event) => {\n"
     "            setNameTouched(true);\n"
     "            setName(event.target.value);\n"
     "          }}\n"
     "        />\n"
     "      </label>"),

    ("          name: suggestedName(new Date()),",
     "          name: name.trim() === '' ? suggestedName(new Date()) : name.trim(),"),

    ("          accept=\".csv,.tsv,.txt,text/csv,text/plain\"",
     "          accept=\".csv,.tsv,.txt,text/csv,text/plain\"\n          aria-label=\"Файл с таблицей\""),
]
for old, new in pairs:
    assert s.count(old) == 1, 'не найдено: %r' % old[:60]
    s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('поле имени добавлено')
PY
```

Скрытый `input type="file"` получает `aria-label`, иначе `getByLabelText('Файл с таблицей')` его не найдёт. Атрибут `hidden` оставляем: `userEvent.upload` работает и со скрытым полем.

- [ ] **Step 4: Добавить стили поля**

Допишите в конец `src/styles/app.css`:

```css
.import__name {
  width: min(90vw, 48rem);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  text-align: left;
}

.import__name span {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.import__name input {
  font: inherit;
  padding: 0.6rem var(--gap);
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--surface-raised);
  border-radius: var(--radius);
}
```

- [ ] **Step 5: Прогнать проверки**

```bash
npm run test && npm run lint && npm run typecheck
```

Ожидается: всё зелёное.

- [ ] **Step 6: Коммит**

```bash
git add src/screens/ImportScreen.tsx src/screens/ImportScreen.test.tsx src/styles/app.css
git commit -m "feat: name a deck when creating it

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Сквозные тесты библиотеки

Проверяется то, что не видно уровнями ниже: две колоды действительно не мешают друг другу в настоящем браузере, а файл, скачанный приложением, им же и загружается обратно.

**Files:**
- Create: `e2e/library.spec.ts`
- Modify: `e2e/fixtures.ts`, `e2e/training.spec.ts`, `e2e/offline.spec.ts`, `e2e-subpath/smoke.spec.ts`

**Interfaces:**
- Consumes: `SHORT_TABLE`, `TABLE` из `./fixtures`
- Produces: `createDeckThroughUi(page, name, table)` из `./fixtures`

> **Ветка `subpath-e2e` уже слита в `master`** (коммит 5a6b0dd), и её стенд живёт в
> отдельной папке `e2e-subpath/` со своим конфигом — конфликта с `e2e/` нет.
> Зато этот стенд импортирует помощники из `e2e/fixtures.ts` и ходит по тем же
> экранам, поэтому чинить его надо здесь же: шаг 3 ниже.

- [ ] **Step 1: Добавить помощник в фикстуры**

Допишите в `e2e/fixtures.ts`:

```ts
/** Проходит экран импорта целиком: имя, таблица, создание колоды. */
export async function createDeckThroughUi(page: Page, name: string, table: string) {
  const nameField = page.getByLabel('Название колоды');
  await nameField.fill(name);
  await page.getByLabel('Таблица со словами').fill(table);
  await page.getByRole('button', { name: 'Создать колоду' }).click();
  await expect(page.getByRole('heading', { name: /Колода готова/ })).toBeVisible();
}
```

- [ ] **Step 2: Написать сквозные тесты**

Создайте `e2e/library.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { SHORT_TABLE, TABLE, createDeckThroughUi } from './fixtures';

test('две колоды не мешают тренировкам друг друга', async ({ page }) => {
  await page.goto('/');

  await createDeckThroughUi(page, 'Юнит 1', TABLE);
  await page.getByRole('button', { name: 'Простой просмотр' }).click();
  await page.getByRole('button', { name: 'Знаю' }).click();
  await expect(page.getByTestId('count-known')).toHaveText('1');

  // Уходим в библиотеку и заводим вторую колоду.
  await page.getByRole('button', { name: 'Закрыть тренировку' }).click();
  await page.getByRole('button', { name: 'Выйти' }).click();
  await page.getByRole('button', { name: 'В библиотеку' }).click();
  await page.getByRole('button', { name: 'Добавить колоду' }).click();
  await createDeckThroughUi(page, 'Юнит 2', SHORT_TABLE);
  await expect(page.getByRole('heading', { name: 'Колода готова: 2 карточки' })).toBeVisible();

  // Первая колода должна помнить, что тренировка не закончена.
  await page.getByRole('button', { name: 'В библиотеку' }).click();
  await expect(page.getByRole('button', { name: /Юнит 1/ })).toContainText('тренировка не закончена');
  await expect(page.getByRole('button', { name: /Юнит 2/ })).not.toContainText('тренировка не закончена');

  // И действительно продолжает с того же места.
  await page.getByRole('button', { name: /Юнит 1/ }).click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByTestId('count-known')).toHaveText('1');
});

test('переименование и удаление колоды', async ({ page }) => {
  await page.goto('/');
  await createDeckThroughUi(page, 'Юнит 1', SHORT_TABLE);
  await page.getByRole('button', { name: 'В библиотеку' }).click();

  await page.getByRole('button', { name: 'переименовать' }).click();
  await page.getByLabel('Название колоды').fill('Переименованная');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByRole('button', { name: /Переименованная/ })).toBeVisible();

  await page.getByRole('button', { name: 'удалить' }).click();
  await expect(page.getByText('Удалить вместе с прогрессом?')).toBeVisible();
  await page.getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByText('Пока ни одной колоды', { exact: false })).toBeVisible();
});

test('библиотека сохраняется в файл и загружается обратно', async ({ page }) => {
  await page.goto('/');
  await createDeckThroughUi(page, 'Юнит 1', SHORT_TABLE);
  await page.getByRole('button', { name: 'В библиотеку' }).click();

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Сохранить в файл' }).click(),
  ]).then(([event]) => event);

  const path = await download.path();
  expect(path).not.toBeNull();

  // Загрузка добавляет колоды, а не заменяет: в списке станет две.
  await page.getByRole('button', { name: 'Загрузить из файла' }).click();
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(path as string);

  await expect(page.getByRole('button', { name: /Юнит 1/ })).toHaveCount(2);
  await expect(page.getByRole('button', { name: /Юнит 1 \(2\)/ })).toBeVisible();
});
```

- [ ] **Step 3: Починить существующие сквозные тесты**

До Этапа 1 первым экраном был импорт, и все три существующих файла заходят прямо на него. Теперь первый экран — библиотека, а заголовок импорта стал «Новая колода». Без этой правки задача 8 оставит ветку с красными тестами.

В `e2e/training.spec.ts` и `e2e/offline.spec.ts` после каждого `page.goto('/')` добавьте переход в импорт:

```ts
await page.getByRole('button', { name: 'Добавить колоду' }).click();
```

и замените все проверки заголовка импорта:

```ts
await expect(page.getByRole('heading', { name: 'Вставьте таблицу со словами' })).toBeVisible();
```

на

```ts
await expect(page.getByRole('heading', { name: 'Новая колода' })).toBeVisible();
```

В `e2e-subpath/smoke.spec.ts` первые три теста проверяют только то, что экран вообще отрисовался, — им нужен не импорт, а сам первый экран. Замените в них проверку заголовка на библиотеку и перехода в импорт не добавляйте:

```ts
await expect(page.getByRole('heading', { name: 'Мои колоды' })).toBeVisible();
```

Четвёртому тесту, «приложение под подпутём работает без сети с первого визита», переход нужен: он заполняет таблицу. После `page.reload()` дождитесь библиотеки, нажмите «Добавить колоду» и дальше по-старому:

```ts
  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Мои колоды' })).toBeVisible();
  await page.getByRole('button', { name: 'Добавить колоду' }).click();
  await page.getByLabel('Таблица со словами').fill(SHORT_TABLE);
  await expect(page.getByText('Добавлено 2 карточки')).toBeVisible();
```

- [ ] **Step 3a: Прогнать оба стенда**

```bash
npm run test:e2e && npm run test:e2e:subpath
```

Ожидается: все тесты зелёные на обоих стендах. Если `waitForEvent('download')` истекает по времени, проверьте, что в `playwright.config.ts` не выставлено `acceptDownloads: false` — по умолчанию загрузки разрешены.

- [ ] **Step 4: Коммит**

```bash
git add e2e/ e2e-subpath/
git commit -m "test: cover the deck library end to end

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Уборка и документация

**Files:**
- Delete: `mockups.html`
- Modify: `README.md`

- [ ] **Step 1: Убедиться, что стили из макета перенесены**

```bash
grep -c "deck-row\|library__" src/styles/app.css
```

Ожидается: число больше нуля. Если ноль — стили из задачи 5 не доехали, вернитесь к ней.

- [ ] **Step 2: Удалить макеты**

```bash
rm -f mockups.html
```

Файл был согласован с пользователем до реализации; его роль закончена, а поддерживать вторую копию стилей незачем.

- [ ] **Step 3: Дополнить README**

Замените раздел «Устройство» в `README.md` на:

```markdown
## Устройство

- `src/core` — чистая логика: разбор таблицы, пиньинь, машина состояний
  тренировки, библиотека колод, хранилище и файлы обмена. Не импортирует React
  и не трогает DOM; это правило проверяется ESLint.
- `src/state` — редьюсер и контекст.
- `src/screens`, `src/components`, `src/hooks` — слой представления.
- `src/lib` — то, что обязано трогать DOM и потому не помещается в `core`:
  сохранение файла на диск.

Колоды хранятся целиком под ключом `flashcards.v3`. Ключ `flashcards.v2`
остаётся от Этапа 0 как запасная копия: он читается один раз при переносе и
больше не изменяется.
```

- [ ] **Step 4: Прогнать всё целиком**

```bash
npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e
```

Ожидается: всё зелёное.

- [ ] **Step 5: Проверить критерии готовности вручную**

```bash
npm run dev
```

Откройте показанный адрес и пройдите:

1. Создайте две колоды с разными именами.
2. Начните тренировку в первой, вернитесь в библиотеку, откройте вторую, вернитесь в первую — прерванная тренировка на месте.
3. Переименуйте колоду, удалите другую с подтверждением.
4. Сохраните библиотеку в файл, загрузите его обратно — колод стало вдвое больше, имена разведены номерами.
5. Выгрузите отдельную колоду таблицей и загрузите её через «Добавить колоду».

Остановите сервер по Ctrl+C.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "chore: drop the mockup page and document the library layout

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Соответствие спеку

| Раздел спека | Задачи |
|--------------|--------|
| Модель данных: `Deck`, `StoredState` версии 3 | 1, 2 |
| Хранение под одним ключом | 2 |
| Перенос из формата Этапа 0 | 2 |
| Состояние приложения и селектор активной колоды | 4 |
| Действия редьюсера | 4 |
| Экран библиотеки: список, сортировка, пометка незавершённой тренировки | 4, 5 |
| Переименование и удаление с подтверждением | 5 |
| Экран импорта: поле имени с подсказкой | 7 |
| Экран итогов: «В библиотеку» | 4 |
| Поток: пустая библиотека, открытие колоды | 4 |
| Выгрузка библиотеки в JSON и загрузка обратно | 3, 6 |
| Конфликты при загрузке: идентификатор, имя, битая сессия | 3 |
| Выгрузка колоды таблицей и экранирование | 3, 6 |
| Обработка ошибок: отказ записи, битый файл | 4, 6 |
| Тесты ядра | 1, 2, 3 |
| Тесты редьюсера | 4 |
| Тесты экранов | 5, 6, 7 |
| Сквозные тесты | 8 |
| Макеты перед реализацией | сделаны до плана, удаляются в 9 |
