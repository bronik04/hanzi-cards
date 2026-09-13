import { newId } from '@/core/id';

export type Card = {
  id: string;
  hanzi: string;
  pinyin: string;
  translation: string;
};

/** Карточка до импорта: содержимое уже разобрано, идентификатора ещё нет. */
export type ParsedCard = Omit<Card, 'id'>;

export type Direction = 'hanzi-to-translation' | 'translation-to-hanzi' | 'hanzi-to-pinyin';

export const DIRECTIONS: readonly Direction[] = [
  'hanzi-to-translation',
  'translation-to-hanzi',
  'hanzi-to-pinyin',
];

export const DIRECTION_LABELS: Record<Direction, string> = {
  'hanzi-to-translation': 'Иероглиф → перевод',
  'translation-to-hanzi': 'Перевод → иероглиф',
  'hanzi-to-pinyin': 'Иероглиф → пиньинь',
};

/** Что показывает одна сторона карточки. Пустая строка означает «не показывать». */
export type CardFace = {
  main: string;
  mainIsHanzi: boolean;
  secondary: string;
  tertiary: string;
};

export const BLOCK_SIZE = 7;

export function splitIntoBlocks<T>(items: readonly T[], blockSize: number = BLOCK_SIZE): T[][] {
  const blocks: T[][] = [];
  for (let i = 0; i < items.length; i += blockSize) {
    blocks.push(items.slice(i, i + blockSize));
  }
  return blocks;
}

/** Выдаёт идентификаторы один раз, в момент создания колоды. */
export function assignIds(cards: readonly ParsedCard[]): Card[] {
  return cards.map((card) => ({ id: newId(), ...card }));
}

export function hasPinyin(cards: readonly Card[]): boolean {
  return cards.some((card) => card.pinyin.trim() !== '');
}

export function frontFace(card: Card, direction: Direction): CardFace {
  if (direction === 'translation-to-hanzi') {
    return { main: card.translation, mainIsHanzi: false, secondary: '', tertiary: '' };
  }
  return { main: card.hanzi, mainIsHanzi: true, secondary: '', tertiary: '' };
}

export function backFace(card: Card, direction: Direction): CardFace {
  switch (direction) {
    case 'hanzi-to-translation':
      return { main: card.translation, mainIsHanzi: false, secondary: card.pinyin, tertiary: '' };
    case 'translation-to-hanzi':
      return { main: card.hanzi, mainIsHanzi: true, secondary: card.pinyin, tertiary: '' };
    case 'hanzi-to-pinyin':
      return { main: card.pinyin, mainIsHanzi: false, secondary: '', tertiary: card.translation };
  }
}
