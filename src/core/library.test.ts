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
