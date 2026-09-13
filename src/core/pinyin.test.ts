import { normalizePinyin } from '@/core/pinyin';

describe('normalizePinyin', () => {
  it('ставит знаки тона вместо цифр', () => {
    expect(normalizePinyin('ni3 hao3')).toBe('nǐ hǎo');
  });

  it('превращает v в ü', () => {
    expect(normalizePinyin('lv4')).toBe('lǜ');
  });

  it('превращает u: в ü', () => {
    expect(normalizePinyin('nu:3')).toBe('nǚ');
  });

  it('нейтральный тон убирает цифру без знака', () => {
    expect(normalizePinyin('ma5')).toBe('ma');
    expect(normalizePinyin('ma0')).toBe('ma');
  });

  it('разбирает слитно записанные слоги', () => {
    expect(normalizePinyin('xie4xie5')).toBe('xièxie');
  });

  it('не трогает уже готовый пиньинь', () => {
    expect(normalizePinyin('nǐ hǎo')).toBe('nǐ hǎo');
  });

  it('сохраняет регистр', () => {
    expect(normalizePinyin('Ni3')).toBe('Nǐ');
    expect(normalizePinyin('Zhong1guo2')).toBe('Zhōngguó');
  });

  it('выбирает гласную по стандартному правилу', () => {
    expect(normalizePinyin('hao3')).toBe('hǎo');
    expect(normalizePinyin('gei3')).toBe('gěi');
    expect(normalizePinyin('dou1')).toBe('dōu');
    expect(normalizePinyin('liu4')).toBe('liù');
    expect(normalizePinyin('hui2')).toBe('huí');
  });

  it('не трогает латиницу без цифры тона', () => {
    expect(normalizePinyin('very good')).toBe('very good');
  });

  it('пустая строка остаётся пустой', () => {
    expect(normalizePinyin('')).toBe('');
  });
});
