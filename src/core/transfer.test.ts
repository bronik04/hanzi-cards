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
import { STORAGE_VERSION } from '@/core/storage';
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

  // Библиотека другой версии — не то же самое, что не библиотека вовсе:
  // Этап 2 когда-нибудь начнёт писать v4, и сообщение должно указывать на
  // настоящую причину, а не отправлять искать поломку не там.
  it('файл другой версии библиотеки получает отдельное сообщение', () => {
    const result = parseLibraryJson(JSON.stringify({ version: 99, decks: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(`Файл сохранён другой версией библиотеки (99 вместо ${STORAGE_VERSION})`);
    }
  });

  // Наличие числового version — не признак библиотеки: package.json тоже
  // подходит под это описание, и его не стоит выдавать за библиотеку другой
  // версии.
  it('чужой файл с числовым version, но без decks, получает общее сообщение', () => {
    const packageJson = JSON.stringify({ name: 'hanzi-cards', version: 1 });
    const result = parseLibraryJson(packageJson);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Файл не похож на сохранённую библиотеку');
  });

  it('библиотека v4-формы всё ещё получает сообщение о версии', () => {
    const futureLibrary = JSON.stringify({ version: 4, decks: [] });
    const result = parseLibraryJson(futureLibrary);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(`Файл сохранён другой версией библиотеки (4 вместо ${STORAGE_VERSION})`);
    }
  });

  it('сообщение о версии отличается от сообщения «не похож на библиотеку»', () => {
    const notLibrary = parseLibraryJson('{не json');
    const wrongVersion = parseLibraryJson(JSON.stringify({ version: 99, decks: [] }));
    if (notLibrary.ok || wrongVersion.ok) throw new Error('оба разбора должны были провалиться');
    expect(notLibrary.error).not.toBe(wrongVersion.error);
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
    // Локальная дата, а не AT: имя файла берёт локальные поля, и при большом
    // отрицательном смещении 10:00 UTC — это ещё предыдущий день.
    expect(libraryFileName(new Date(2026, 8, 14))).toBe('hanzi-cards-2026-09-14.json');
  });

  // TZ фиксирован на время теста, чтобы результат не зависел от часового
  // пояса машины, где запущены тесты.
  describe('часовой пояс', () => {
    const ORIGINAL_TZ = process.env.TZ;

    beforeEach(() => {
      process.env.TZ = 'Europe/Moscow';
    });

    afterEach(() => {
      // Присваивание undefined даёт строку «undefined» — не зону, и Node молча
      // переводит процесс на UTC до конца работы воркера, ломая соседние файлы.
      if (ORIGINAL_TZ === undefined) delete process.env.TZ;
      else process.env.TZ = ORIGINAL_TZ;
    });

    it('берёт локальную дату, а не UTC, когда они расходятся', () => {
      // 23:30 UTC — это уже 02:30 следующего дня по Москве (UTC+3).
      expect(libraryFileName(new Date('2026-09-14T23:30:00Z'))).toBe('hanzi-cards-2026-09-15.json');
    });
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
