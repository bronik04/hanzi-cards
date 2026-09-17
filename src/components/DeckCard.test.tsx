import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeckCard from '@/components/DeckCard';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import type { Card } from '@/core/deck';

const AT = new Date(2026, 8, 16);
const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

const UNFINISHED: Deck['session'] = {
  mode: 'simple',
  round: 1,
  queue: ['c1'],
  nextRound: [],
  perfectRound: true,
  finalRound: false,
  finished: false,
};

function setup(overrides: Partial<Deck> = {}) {
  const deck = { ...createDeck('Юнит 1', cards, AT), ...overrides };
  const handlers = {
    onOpen: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onExport: vi.fn(),
  };
  const user = userEvent.setup();
  render(<DeckCard deck={deck} {...handlers} />);
  return { user, ...handlers };
}

/** Кнопка меню: в её доступном имени стоит название колоды. */
function menuButton() {
  return screen.getByRole('button', { name: /Действия с колодой/ });
}

/** Открыть меню и выбрать пункт — путь ко всем действиям над колодой. */
async function pick(user: ReturnType<typeof userEvent.setup>, item: string) {
  await user.click(menuButton());
  await user.click(screen.getByRole('menuitem', { name: item }));
}

describe('DeckCard, обычный вид', () => {
  it('показывает имя и число карточек', () => {
    setup();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
    expect(screen.getByText('2 карточки')).toBeInTheDocument();
  });

  it('нажатие на карточку открывает колоду', async () => {
    const { user, onOpen } = setup();
    await user.click(screen.getByRole('button', { name: /^Юнит 1/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('помечает незавершённую тренировку', () => {
    setup({ session: UNFINISHED });
    expect(screen.getByText('тренировка не закончена')).toBeInTheDocument();
  });

  it('без сессии пометки нет', () => {
    setup({ session: null });
    expect(screen.queryByText('тренировка не закончена')).not.toBeInTheDocument();
  });

  it('законченную тренировку не помечает', () => {
    setup({ session: { ...UNFINISHED, queue: [], finished: true } });
    expect(screen.queryByText('тренировка не закончена')).not.toBeInTheDocument();
  });

  // Название колоды в имени кнопки — чтобы читалка не произносила «Действия»
  // подряд столько раз, сколько колод в библиотеке.
  it('в имени кнопки меню стоит название колоды', () => {
    setup();
    expect(menuButton()).toHaveAccessibleName('Действия с колодой «Юнит 1»');
  });

  it('две карточки различимы по доступным именам', () => {
    const handlers = { onOpen: vi.fn(), onRename: vi.fn(), onDelete: vi.fn(), onExport: vi.fn() };
    render(
      <>
        <DeckCard deck={createDeck('Юнит 1', cards, AT)} {...handlers} />
        <DeckCard deck={createDeck('Юнит 2', cards, AT)} {...handlers} />
      </>,
    );

    expect(
      screen.getByRole('button', { name: 'Действия с колодой «Юнит 1»' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Действия с колодой «Юнит 2»' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Юнит 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Юнит 2/ })).toBeInTheDocument();
  });
});

describe('DeckCard, переименование', () => {
  it('пункт меню открывает поле с текущим именем', async () => {
    const { user } = setup();
    await pick(user, 'Переименовать');
    expect(screen.getByLabelText('Название колоды')).toHaveValue('Юнит 1');
  });

  it('переименование отдаёт новое имя', async () => {
    const { user, onRename } = setup();
    await pick(user, 'Переименовать');
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.type(screen.getByLabelText('Название колоды'), 'Юнит 2');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onRename).toHaveBeenCalledWith('Юнит 2');
  });

  it('переименование можно отменить кнопкой', async () => {
    const { user, onRename } = setup();
    await pick(user, 'Переименовать');
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.type(screen.getByLabelText('Название колоды'), 'Черновик');
    await user.click(screen.getByRole('button', { name: 'отмена' }));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
  });

  it('Enter в поле переименования сохраняет имя', async () => {
    const { user, onRename } = setup();
    await pick(user, 'Переименовать');
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.type(screen.getByLabelText('Название колоды'), 'Юнит 3{Enter}');

    expect(onRename).toHaveBeenCalledWith('Юнит 3');
    // Редактор обязан закрыться: иначе карточка застревает в режиме правки.
    expect(screen.queryByLabelText('Название колоды')).not.toBeInTheDocument();
  });

  it('Escape отменяет ввод и восстанавливает исходное имя', async () => {
    const { user, onRename } = setup();
    await pick(user, 'Переименовать');
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.type(screen.getByLabelText('Название колоды'), 'Черновик{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
  });

  it('Enter с пустым полем ничего не сохраняет', async () => {
    const { user, onRename } = setup();
    await pick(user, 'Переименовать');
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.keyboard('{Enter}');

    expect(onRename).not.toHaveBeenCalled();
    // И остаться открытым: закрыться, выбросив ввод, было бы хуже отказа.
    expect(screen.getByLabelText('Название колоды')).toBeInTheDocument();
  });

  it('«Сохранить» отключена, пока поле пустое', async () => {
    const { user } = setup();
    await pick(user, 'Переименовать');
    await user.clear(screen.getByLabelText('Название колоды'));

    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  });

  it('«Сохранить» отключена и на имени из одних пробелов', async () => {
    const { user } = setup();
    await pick(user, 'Переименовать');
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.type(screen.getByLabelText('Название колоды'), '   ');

    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  });
});

describe('DeckCard, удаление', () => {
  it('удаление требует подтверждения', async () => {
    const { user, onDelete } = setup();
    await pick(user, 'Удалить');

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Удалить вместе с прогрессом?')).toBeInTheDocument();
  });

  // Фокус на «отмена», а не на «Удалить»: случайный Enter не должен стирать
  // колоду — ровно ради этого подтверждение и существует.
  it('при открытии подтверждения фокус уходит на «отмена»', async () => {
    const { user } = setup();
    await pick(user, 'Удалить');

    expect(screen.getByRole('button', { name: /^отмена/ })).toHaveFocus();
  });

  it('подтверждение удаляет', async () => {
    const { user, onDelete } = setup();
    await pick(user, 'Удалить');
    await user.click(screen.getByRole('button', { name: /^Удалить «/ }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('подтверждение удаления можно отменить', async () => {
    const { user, onDelete } = setup();
    await pick(user, 'Удалить');
    await user.click(screen.getByRole('button', { name: /^отмена/ }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
  });
});

describe('DeckCard, выгрузка', () => {
  it('выгрузка вызывается сразу', async () => {
    const { user, onExport } = setup();
    await pick(user, 'Выгрузить таблицей');

    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
