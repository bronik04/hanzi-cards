import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { STORAGE_KEY, STORAGE_VERSION } from '@/core/storage';
import type { StorageLike, StoredState } from '@/core/storage';

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

  it('отмена импорта возвращает в тренировку и сохраняет прогресс', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByRole('button', { name: 'Простой просмотр' }));
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');

    await user.click(screen.getByRole('button', { name: 'Загрузить новую таблицу' }));
    await user.click(screen.getByRole('button', { name: 'Отменить' }));

    expect(screen.getByText('谢谢')).toBeInTheDocument();
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
  });

  it('сохранённая сессия приводит на экран возобновления', () => {
    const stored: StoredState = {
      version: STORAGE_VERSION,
      cards: [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' }],
      direction: 'hanzi-to-translation',
      session: {
        mode: 'simple', round: 1, queue: ['c1'], nextRound: [],
        perfectRound: true, finalRound: false, finished: false,
      },
      stats: { known: 0, unknown: 0 },
    };
    const { storage } = memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
    render(<App storage={storage} />);

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
    expect(
      screen.getByText('Прогресс не сохраняется: браузер не разрешает запись.'),
    ).toBeInTheDocument();
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
