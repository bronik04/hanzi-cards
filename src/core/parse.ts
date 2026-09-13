import type { Card } from '@/core/deck';
import { newId } from '@/core/id';
import { normalizePinyin } from '@/core/pinyin';

export type ColumnMode = 'auto' | 'three' | 'two';

export type ParseResult = {
  cards: Card[];
  addedCount: number;
  skippedCount: number;
};

const HEADER_FIRST = /^(иероглиф|汉字|hanzi|слово|word|term)$/i;
const HEADER_LAST = /^(перевод|translation|значение|meaning)$/i;

/** Латиница, ü, гласные с тонами, пробелы, апострофы, дефисы, двоеточия и цифры 0–5. */
const PINYIN_ONLY = /^[a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s'\-:0-5]+$/;

export function detectDelimiter(line: string): string {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  return ',';
}

export function looksLikePinyin(value: string): boolean {
  return value.trim() !== '' && PINYIN_ONLY.test(value);
}

export function parseTable(text: string, columnMode: ColumnMode = 'auto'): ParseResult {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const firstNonEmpty = lines.find((line) => line.trim() !== '');
  if (firstNonEmpty === undefined) {
    return { cards: [], addedCount: 0, skippedCount: 0 };
  }

  const delimiter = detectDelimiter(firstNonEmpty);
  const body = lines.slice();

  const headerCells = splitLine(firstNonEmpty, delimiter);
  const firstCell = headerCells[0];
  const lastCell = headerCells[headerCells.length - 1];
  const isHeader =
    headerCells.length >= 2 &&
    firstCell !== undefined &&
    lastCell !== undefined &&
    HEADER_FIRST.test(firstCell) &&
    HEADER_LAST.test(lastCell);
  if (isHeader) {
    body.splice(body.indexOf(firstNonEmpty), 1);
  }

  const cards: Card[] = [];
  let skippedCount = 0;

  for (const line of body) {
    // Пустые строки не считаются пропущенными: завершающий перевод строки есть
    // почти в любой скопированной таблице и давал бы вечное «пропущено 1».
    if (line.trim() === '') continue;

    const card = buildCard(splitLine(line, delimiter), delimiter, columnMode);
    if (card === null) {
      skippedCount += 1;
      continue;
    }
    cards.push(card);
  }

  return { cards, addedCount: cards.length, skippedCount };
}

function splitLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((cell) => cell.trim());
}

function joinRest(cells: string[], delimiter: string): string {
  const separator = delimiter === '\t' ? ' ' : `${delimiter} `;
  return cells
    .filter((cell) => cell !== '')
    .join(separator)
    .trim();
}

function buildCard(cells: string[], delimiter: string, columnMode: ColumnMode): Card | null {
  if (cells.length < 2) return null;

  const hanzi = cells[0] ?? '';
  const second = cells[1] ?? '';

  const secondIsPinyin =
    cells.length >= 3 &&
    (columnMode === 'three' || (columnMode === 'auto' && looksLikePinyin(second)));

  const pinyin = secondIsPinyin ? normalizePinyin(second) : '';
  const translation = joinRest(cells.slice(secondIsPinyin ? 2 : 1), delimiter);

  if (hanzi === '' || translation === '') return null;
  return { id: newId(), hanzi, pinyin, translation };
}
