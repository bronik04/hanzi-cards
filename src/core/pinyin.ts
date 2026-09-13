const TONE_MARKS: Record<string, readonly string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

const VOWELS = 'aeiouü';
const SYLLABLE_WITH_TONE = /([a-zA-ZüÜ]+)([0-5])/g;

/**
 * Приводит пиньинь к записи с диакритикой. Слоги без цифры тона не меняются,
 * поэтому уже готовый пиньинь проходит функцию насквозь.
 */
export function normalizePinyin(input: string): string {
  const prepared = input.replace(/u:/g, 'ü').replace(/U:/g, 'Ü');

  return prepared.replace(SYLLABLE_WITH_TONE, (match, letters: string, digit: string) => {
    // v → ü только внутри слога с тоном: иначе английский перевод,
    // ошибочно принятый за пиньинь, превратился бы в кашу.
    const syllable = letters.replace(/v/g, 'ü').replace(/V/g, 'Ü');

    // Без гласной цифра тоном быть не может: «HSK4» — это не слог,
    // и отрезать у неё четвёрку значит молча испортить данные.
    const index = toneVowelIndex(syllable);
    if (index === -1) return match;

    const tone = Number(digit);
    // 0 и 5 — нейтральный тон: цифра уходит, знак не ставится.
    if (tone === 0 || tone === 5) return syllable;
    return applyTone(syllable, tone, index);
  });
}

function applyTone(syllable: string, tone: number, index: number): string {
  const vowel = syllable[index];
  if (vowel === undefined) return syllable;

  const marks = TONE_MARKS[vowel.toLowerCase()];
  const marked = marks?.[tone - 1];
  if (marked === undefined) return syllable;

  const isUpperCase = vowel !== vowel.toLowerCase();
  return (
    syllable.slice(0, index) + (isUpperCase ? marked.toUpperCase() : marked) + syllable.slice(index + 1)
  );
}

/** Стандартное правило: a, иначе e, иначе o в сочетании ou, иначе последняя гласная. */
function toneVowelIndex(syllable: string): number {
  const lower = syllable.toLowerCase();

  const a = lower.indexOf('a');
  if (a !== -1) return a;

  const e = lower.indexOf('e');
  if (e !== -1) return e;

  const ou = lower.indexOf('ou');
  if (ou !== -1) return ou;

  for (let i = lower.length - 1; i >= 0; i -= 1) {
    const char = lower[i];
    if (char !== undefined && VOWELS.includes(char)) return i;
  }
  return -1;
}
