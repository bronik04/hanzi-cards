import { detectDelimiter, looksLikePinyin, parseTable } from '@/core/parse';

describe('detectDelimiter', () => {
  it('табуляция важнее запятой', () => {
    expect(detectDelimiter('你好\tnǐ hǎo\tпривет, здравствуйте')).toBe('\t');
  });

  it('точка с запятой важнее запятой', () => {
    expect(detectDelimiter('你好;привет, здравствуйте')).toBe(';');
  });

  it('по умолчанию запятая', () => {
    expect(detectDelimiter('你好,привет')).toBe(',');
  });
});

describe('looksLikePinyin', () => {
  it('латиница с тоновыми знаками и цифрами — пиньинь', () => {
    expect(looksLikePinyin('nǐ hǎo')).toBe(true);
    expect(looksLikePinyin('ni3 hao3')).toBe(true);
    expect(looksLikePinyin("xi'an")).toBe(true);
  });

  it('кириллица и иероглифы — не пиньинь', () => {
    expect(looksLikePinyin('привет')).toBe(false);
    expect(looksLikePinyin('你好')).toBe(false);
  });

  it('пустая строка — не пиньинь', () => {
    expect(looksLikePinyin('  ')).toBe(false);
  });
});

describe('parseTable: три колонки', () => {
  it('разбирает табуляцию с пиньинем', () => {
    const result = parseTable('你好\tni3 hao3\tпривет');
    expect(result.addedCount).toBe(1);
    expect(result.cards[0]).toMatchObject({ hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' });
  });

  it('присваивает каждой карточке идентификатор', () => {
    const result = parseTable('你好\tni3 hao3\tпривет\n谢谢\txie4xie5\tспасибо');
    const ids = result.cards.map((card) => card.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });
});

describe('parseTable: две колонки', () => {
  it('оставляет пиньинь пустым', () => {
    const result = parseTable('你好,привет');
    expect(result.cards[0]).toMatchObject({ hanzi: '你好', pinyin: '', translation: 'привет' });
  });
});

describe('parseTable: автоопределение колонок', () => {
  it('кириллица во второй колонке означает перевод с запятой внутри', () => {
    const result = parseTable('你好,привет, здравствуйте');
    expect(result.addedCount).toBe(1);
    expect(result.cards[0]).toMatchObject({
      hanzi: '你好', pinyin: '', translation: 'привет, здравствуйте',
    });
  });

  it('решает построчно: строка с пиньинем и строка без него в одной таблице', () => {
    const result = parseTable('你好,ni3 hao3,привет\n谢谢,спасибо');
    expect(result.cards[0]).toMatchObject({ pinyin: 'nǐ hǎo', translation: 'привет' });
    expect(result.cards[1]).toMatchObject({ pinyin: '', translation: 'спасибо' });
  });

  it('режим two запрещает считать вторую колонку пиньинем', () => {
    const result = parseTable('你好,ni3 hao3,привет', 'two');
    expect(result.cards[0]).toMatchObject({ pinyin: '', translation: 'ni3 hao3, привет' });
  });

  it('режим three заставляет считать вторую колонку пиньинем', () => {
    const result = parseTable('你好,hello,greeting', 'three');
    expect(result.cards[0]).toMatchObject({ pinyin: 'hello', translation: 'greeting' });
  });
});

describe('parseTable: заголовок', () => {
  it('пропускает строку заголовка', () => {
    const result = parseTable('иероглиф,пиньинь,перевод\n你好,ni3 hao3,привет');
    expect(result.addedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
  });

  it('распознаёт английский заголовок из двух колонок', () => {
    const result = parseTable('Hanzi,Translation\n你好,привет');
    expect(result.addedCount).toBe(1);
  });

  it('не принимает за заголовок обычную строку', () => {
    const result = parseTable('你好,привет\n谢谢,спасибо');
    expect(result.addedCount).toBe(2);
  });
});

describe('parseTable: пропуск строк', () => {
  it('пустые строки не попадают в счётчик пропущенных', () => {
    const result = parseTable('你好,привет\n\n谢谢,спасибо\n');
    expect(result.addedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
  });

  it('строку из одной колонки считает пропущенной', () => {
    const result = parseTable('你好,привет\nмусор');
    expect(result.addedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });

  it('пропускает строку с пустым иероглифом или пустым переводом', () => {
    const result = parseTable(',привет\n你好,');
    expect(result.addedCount).toBe(0);
    expect(result.skippedCount).toBe(2);
  });

  it('пустой ввод даёт пустой результат', () => {
    expect(parseTable('   ')).toEqual({ cards: [], addedCount: 0, skippedCount: 0 });
  });
});

describe('parseTable: склейка лишних колонок', () => {
  it('склеивает хвост через табуляцию пробелом', () => {
    const result = parseTable('你好\tni3 hao3\tпривет\tздравствуйте');
    expect(result.cards[0]?.translation).toBe('привет здравствуйте');
  });

  it('склеивает хвост через запятую запятой с пробелом', () => {
    const result = parseTable('你好,ni3 hao3,привет,здравствуйте');
    expect(result.cards[0]?.translation).toBe('привет, здравствуйте');
  });
});
