import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryScreen from '@/screens/LibraryScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import { exportLibraryJson } from '@/core/transfer';
import { STORAGE_VERSION } from '@/core/storage';
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

/** Файл в формате, который отдаёт сама выгрузка библиотеки, — так тест не
 *  разойдётся с реальным форматом при его изменении. */
function libraryFile(decks: Deck[]): File {
  return new File([exportLibraryJson(decks)], 'library.json', { type: 'application/json' });
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

/** Чтения, остановленные на середине: настоящий FileReader в jsdom успевает
 *  закончить до возврата из upload, и вклиниться между ними иначе нельзя. */
const pendingReads: Array<{ finish: () => Promise<void> }> = [];

class PausedFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;

  readAsText(file: File) {
    pendingReads.push({
      finish: async () => {
        this.result = await file.text();
        this.onload?.();
      },
    });
  }
}

describe('LibraryScreen', () => {
  beforeEach(() => {
    downloads.length = 0;
    pendingReads.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('загрузка файла добавляет колоды к уже имеющимся', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProvider(<LibraryScreen />, withDecks());

    const incoming = createDeck('Импорт', cards, AT);
    await user.upload(fileInput(container), libraryFile([incoming]));

    await screen.findByText('Импорт');
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
    expect(screen.getByText('Юнит 2')).toBeInTheDocument();
  });

  it('повторная загрузка того же файла даёт второй комплект колод', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProvider(<LibraryScreen />, withDecks());
    const file = libraryFile([createDeck('Импорт', cards, AT)]);

    await user.upload(fileInput(container), file);
    await screen.findByText('Импорт');

    await user.upload(fileInput(container), file);
    await screen.findByText('Импорт (2)');

    expect(screen.getByText('Импорт')).toBeInTheDocument();
    expect(screen.getByText('Импорт (2)')).toBeInTheDocument();
  });

  // Слияние в обработчике замыкает список колод на тот рендер, где началось
  // чтение файла: правка, сделанная за время чтения, вычисляется обратно.
  it('удаление колоды во время чтения файла не отменяется загрузкой', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('FileReader', PausedFileReader);
    const { container } = renderWithProvider(<LibraryScreen />, withDecks());

    await user.upload(fileInput(container), libraryFile([createDeck('Импорт', cards, AT)]));
    expect(pendingReads).toHaveLength(1);

    // Файл ещё читается, а пользователь уже удалил колоду.
    await user.click(screen.getByRole('button', { name: 'удалить «Юнит 1»' }));
    await user.click(screen.getByRole('button', { name: 'Удалить «Юнит 1»' }));
    expect(screen.queryByText('Юнит 1')).not.toBeInTheDocument();

    await act(async () => {
      await pendingReads[0]?.finish();
    });

    expect(screen.getByText('Импорт')).toBeInTheDocument();
    expect(screen.queryByText('Юнит 1')).not.toBeInTheDocument();
    expect(screen.getByText('Юнит 2')).toBeInTheDocument();
  });

  it('нечитаемый файл отклоняется с сообщением, библиотека не меняется', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProvider(<LibraryScreen />, withDecks());
    const broken = new File(['{не json'], 'library.json', { type: 'application/json' });

    await user.upload(fileInput(container), broken);

    await screen.findByText('Файл не похож на сохранённую библиотеку');
    expect(screen.getAllByRole('button', { name: /^Юнит/ })).toHaveLength(2);
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
    expect(screen.getByText('Юнит 2')).toBeInTheDocument();
  });

  // 1e999 разбирается как Infinity, а записывается обратно как null: приняв
  // такой файл, приложение сохранило бы библиотеку, которую само же не прочтёт.
  it('файл с бесконечным счётчиком отклоняется, а не попадает в библиотеку', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProvider(<LibraryScreen />, withDecks());
    const raw = JSON.stringify({
      version: STORAGE_VERSION,
      decks: [{ ...createDeck('Импорт', cards, AT), stats: { known: '@@', unknown: 0 } }],
    }).replace('"@@"', '1e999');

    await user.upload(
      fileInput(container),
      new File([raw], 'library.json', { type: 'application/json' }),
    );

    await screen.findByText('Файл не похож на сохранённую библиотеку');
    expect(screen.queryByText('Импорт')).not.toBeInTheDocument();
  });

  it('успешная загрузка убирает сообщение об ошибке прошлой попытки', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProvider(<LibraryScreen />, withDecks());
    const broken = new File(['{не json'], 'library.json', { type: 'application/json' });

    await user.upload(fileInput(container), broken);
    await screen.findByText('Файл не похож на сохранённую библиотеку');

    const good = libraryFile([createDeck('Импорт', cards, AT)]);
    await user.upload(fileInput(container), good);
    await screen.findByText('Импорт');

    expect(screen.queryByText('Файл не похож на сохранённую библиотеку')).not.toBeInTheDocument();
  });
});
