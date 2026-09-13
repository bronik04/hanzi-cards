import { BLOCK_SIZE, backFace, frontFace, hasPinyin, splitIntoBlocks } from '@/core/deck';
import type { Card } from '@/core/deck';
import { newId } from '@/core/id';

const card: Card = { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' };
const noPinyin: Card = { id: 'c2', hanzi: '谢谢', pinyin: '', translation: 'спасибо' };

describe('newId', () => {
  it('выдаёт непустые и различные идентификаторы', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()));
    expect(ids.size).toBe(100);
    expect([...ids].every((id) => id.length > 0)).toBe(true);
  });
});

describe('splitIntoBlocks', () => {
  it('режет по семь и оставляет короткий последний блок', () => {
    const items = Array.from({ length: 8 }, (_, i) => i);
    expect(splitIntoBlocks(items, BLOCK_SIZE)).toEqual([[0, 1, 2, 3, 4, 5, 6], [7]]);
  });

  it('на пустом входе даёт пустой список блоков', () => {
    expect(splitIntoBlocks([], BLOCK_SIZE)).toEqual([]);
  });

  it('по умолчанию использует BLOCK_SIZE', () => {
    expect(splitIntoBlocks(Array.from({ length: 7 }, (_, i) => i))).toHaveLength(1);
  });
});

describe('hasPinyin', () => {
  it('истина, если хотя бы у одной карточки есть пиньинь', () => {
    expect(hasPinyin([noPinyin, card])).toBe(true);
  });

  it('ложь, если пиньиня нет ни у одной', () => {
    expect(hasPinyin([noPinyin, { ...noPinyin, pinyin: '   ' }])).toBe(false);
  });

  it('ложь на пустой колоде', () => {
    expect(hasPinyin([])).toBe(false);
  });
});

describe('frontFace и backFace', () => {
  it('иероглиф → перевод', () => {
    expect(frontFace(card, 'hanzi-to-translation')).toEqual({
      main: '你好', mainIsHanzi: true, secondary: '', tertiary: '',
    });
    expect(backFace(card, 'hanzi-to-translation')).toEqual({
      main: 'привет', mainIsHanzi: false, secondary: 'nǐ hǎo', tertiary: '',
    });
  });

  it('перевод → иероглиф', () => {
    expect(frontFace(card, 'translation-to-hanzi')).toEqual({
      main: 'привет', mainIsHanzi: false, secondary: '', tertiary: '',
    });
    expect(backFace(card, 'translation-to-hanzi')).toEqual({
      main: '你好', mainIsHanzi: true, secondary: 'nǐ hǎo', tertiary: '',
    });
  });

  it('иероглиф → пиньинь: перевод уходит в мелкую строку', () => {
    expect(backFace(card, 'hanzi-to-pinyin')).toEqual({
      main: 'nǐ hǎo', mainIsHanzi: false, secondary: '', tertiary: 'привет',
    });
  });

  it('пустой пиньинь не попадает на обратную сторону', () => {
    expect(backFace(noPinyin, 'hanzi-to-translation').secondary).toBe('');
  });
});
