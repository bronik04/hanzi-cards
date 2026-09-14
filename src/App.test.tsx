import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { STORAGE_KEY, STORAGE_VERSION } from '@/core/storage';
import type { StorageLike, StoredState } from '@/core/storage';
import { createDeck, suggestedName } from '@/core/library';
import type { Deck } from '@/core/library';

const AT = new Date('2026-09-14T10:00:00Z');

function memoryStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  const storage: StorageLike = {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
  return { storage, data };
}


// App рендерит UpdatePrompt, а виртуальный модуль существует только в сборке Vite.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

const TABLE = '你好\tni3 hao3\tпривет\n谢谢\txie4xie5\tспасибо';

async function importDeck(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText('Таблица со словами'));
  await user.paste(TABLE);
  await user.click(screen.getByRole('button', { name: 'Создать колоду' }));
}

describe('App: полный цикл', () => {
  it('импорт таблицы ведёт на экран выбора режима', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    expect(screen.getByRole('heading', { name: 'Колода готова: 2 карточки' })).toBeInTheDocument();
  });

  // ModeScreen имя колоды не показывает — единственное место, где оно видно,
  // это библиотека, поэтому имя проверяется через переход туда.
  it('созданная колода получает имя-подсказку', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));
    expect(screen.getByText(suggestedName(new Date()))).toBeInTheDocument();
  });

  it('простой режим доходит до экрана итогов', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByRole('button', { name: 'Простой просмотр' }));

    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');
    await user.click(screen.getByRole('button', { name: 'Знаю' }));

    expect(await screen.findByRole('heading', { name: 'Готово' })).toBeInTheDocument();
    expect(screen.getByText('Знаю: 2 · Не знаю: 0')).toBeInTheDocument();
  });

  it('отмена импорта не трогает начатую тренировку', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByRole('button', { name: 'Простой просмотр' }));
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');

    await user.click(screen.getByRole('button', { name: 'Загрузить новую таблицу' }));
    await user.click(screen.getByRole('button', { name: 'Отменить' }));
    expect(screen.getByRole('heading', { name: 'Мои колоды' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /карточк/ }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(screen.getByText('谢谢')).toBeInTheDocument();
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
  });

  it('сохранённая сессия видна в библиотеке и открывается на возобновлении', async () => {
    const user = userEvent.setup();
    const deck: Deck = {
      ...createDeck('Юнит 1', [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' }], AT),
      session: {
        mode: 'simple', round: 1, queue: ['c1'], nextRound: [],
        perfectRound: true, finalRound: false, finished: false,
      },
    };
    const stored: StoredState = { version: STORAGE_VERSION, decks: [deck], activeDeckId: deck.id };
    const { storage } = memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
    render(<App storage={storage} />);

    expect(screen.getByRole('heading', { name: 'Мои колоды' })).toBeInTheDocument();
    expect(screen.getByText('тренировка не закончена', { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Юнит 1/ }));
    expect(screen.getByRole('heading', { name: 'Продолжить тренировку?' })).toBeInTheDocument();
  });

  it('предупреждает, если прогресс не сохраняется', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    render(<App storage={failing} />);
    const warning = screen.getByText('Прогресс не сохраняется', { exact: false });
    // Совет выгрузить библиотеку — часть предупреждения: при переполнении квоты
    // файл остаётся единственным способом не потерять колоды.
    expect(warning).toHaveTextContent('Сохраните библиотеку в файл, чтобы не потерять колоды.');
  });

  it('выбранное направление применяется к тренировке', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByLabelText('Перевод → иероглиф'));
    await user.click(screen.getByRole('button', { name: 'Простой просмотр' }));

    expect(screen.getByText('привет')).toBeInTheDocument();
  });
});
