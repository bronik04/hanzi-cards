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
    const names = screen.getAllByRole('button', { name: /^Юнит/ }).map((node) => node.textContent);
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
    // Доступное имя кнопки включает название колоды (см. DeckRow.test.tsx) —
    // точное совпадение 'выгрузить' ничего не найдёт, нужен якорный поиск.
    const rows = screen.getAllByRole('button', { name: /^выгрузить/ });
    await user.click(rows[0] as HTMLElement);

    expect(downloads[0]?.fileName).toBe('Юнит 2.tsv');
    expect(downloads[0]?.text.split('\n')[0]).toBe('иероглиф\tпиньинь\tперевод');
  });

  it('пустая библиотека не предлагает сохранение', () => {
    renderWithProvider(<LibraryScreen />, { ...initialState, hydrated: true, screen: 'library' });
    expect(screen.queryByRole('button', { name: 'Сохранить в файл' })).not.toBeInTheDocument();
  });
});
