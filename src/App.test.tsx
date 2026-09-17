import { render, screen, waitFor } from '@testing-library/react';
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

  // Экран импорта только показывает поле ввода — реально ли введённое имя
  // доходит до созданной колоды, видно только тут, через библиотеку.
  it('введённое имя колоды используется при создании', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste(TABLE);
    const nameField = screen.getByLabelText('Название колоды');
    await user.clear(nameField);
    await user.type(nameField, 'Юнит 3');
    await user.click(screen.getByRole('button', { name: 'Создать колоду' }));

    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));
    expect(screen.getByText('Юнит 3')).toBeInTheDocument();
    expect(screen.queryByText(suggestedName(new Date()))).not.toBeInTheDocument();
  });

  it('пустое имя колоды заменяется подсказкой', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste(TABLE);
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.click(screen.getByRole('button', { name: 'Создать колоду' }));

    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));
    expect(screen.getByText(suggestedName(new Date()))).toBeInTheDocument();
  });

  it('имя из одних пробелов заменяется подсказкой, а не сохраняется как есть', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste(TABLE);
    const nameField = screen.getByLabelText('Название колоды');
    await user.clear(nameField);
    await user.type(nameField, '   ');
    await user.click(screen.getByRole('button', { name: 'Создать колоду' }));

    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));
    expect(screen.getByText(suggestedName(new Date()))).toBeInTheDocument();
  });

  // Свежий браузер открывается на импорте, и «Загрузить из файла» есть только
  // в библиотеке: без выхода отсюда сохранённый файл некуда вернуть.
  it('с пустой библиотекой из импорта можно уйти в библиотеку', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));
    expect(screen.getByRole('heading', { name: 'Мои колоды' })).toBeInTheDocument();
    expect(screen.getByText('Пока ни одной колоды', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Загрузить из файла' })).toBeInTheDocument();
  });

  it('простой режим доходит до экрана итогов', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByRole('button', { name: /^Просмотр/ }));

    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');
    await user.click(screen.getByRole('button', { name: 'Знаю' }));

    expect(await screen.findByRole('heading', { name: 'Готово' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Верных ответов: 100%' })).toBeInTheDocument();
    // Счётчики на итогах набегают, поэтому ждём конечное значение.
    await waitFor(() => expect(screen.getByTestId('count-known')).toHaveTextContent('2'), {
      timeout: 3000,
    });
    expect(screen.getByTestId('count-unknown')).toHaveTextContent('0');
  });

  it('отмена импорта не трогает начатую тренировку', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByRole('button', { name: /^Просмотр/ }));
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');

    await user.click(screen.getByRole('button', { name: 'Загрузить новую таблицу' }));
    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));
    expect(screen.getByRole('heading', { name: 'Мои колоды' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /карточк/ }));
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(screen.getByText('谢谢')).toBeInTheDocument();
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
  });

  // Уход в библиотеку не должен стоить прогресса: проверяется не смена экрана,
  // а то, что тренировка продолжается с того же места и с тем же счётом.
  it('выход в библиотеку с экрана возобновления сохраняет прогресс', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByRole('button', { name: /^Просмотр/ }));
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');

    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));
    await user.click(screen.getByRole('button', { name: /карточк/ }));
    expect(screen.getByRole('heading', { name: 'Продолжить тренировку?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));
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

  it('предупреждает, если сохранённую библиотеку не удалось прочитать', () => {
    const { storage } = memoryStorage({ [STORAGE_KEY]: '{не json' });
    render(<App storage={storage} />);

    const warning = screen.getByText('Сохранённую библиотеку не удалось прочитать', {
      exact: false,
    });
    expect(warning).toHaveTextContent('она осталась в браузере нетронутой');
    expect(warning).toHaveTextContent('Откройте библиотеку и загрузите её из файла.');
  });

  it('выбранное направление применяется к тренировке', async () => {
    const user = userEvent.setup();
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await importDeck(user);
    await user.click(screen.getByLabelText('Перевод → иероглиф'));
    await user.click(screen.getByRole('button', { name: /^Просмотр/ }));

    expect(screen.getByText('привет')).toBeInTheDocument();
  });
});
