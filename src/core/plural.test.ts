import { cardsCount, plural } from '@/core/plural';

const CARDS: [string, string, string] = ['карточка', 'карточки', 'карточек'];

describe('plural', () => {
  it('единственное число', () => {
    expect(plural(1, CARDS)).toBe('карточка');
    expect(plural(21, CARDS)).toBe('карточка');
  });

  it('от двух до четырёх', () => {
    expect(plural(2, CARDS)).toBe('карточки');
    expect(plural(34, CARDS)).toBe('карточки');
  });

  it('множественное число', () => {
    expect(plural(0, CARDS)).toBe('карточек');
    expect(plural(5, CARDS)).toBe('карточек');
    expect(plural(11, CARDS)).toBe('карточек');
    expect(plural(112, CARDS)).toBe('карточек');
  });
});

describe('cardsCount', () => {
  it('склеивает число со склонённым словом', () => {
    expect(cardsCount(1)).toBe('1 карточка');
    expect(cardsCount(2)).toBe('2 карточки');
    expect(cardsCount(8)).toBe('8 карточек');
  });
});
