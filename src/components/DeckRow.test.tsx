import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeckRow from '@/components/DeckRow';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import { createSession } from '@/core/session';
import type { Card } from '@/core/deck';

const AT = new Date('2026-09-14T10:00:00Z');
const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function renderRow(overrides: Partial<Deck> = {}) {
  const deck = { ...createDeck('Юнит 1', cards, AT), ...overrides };
  const handlers = {
    onOpen: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onExport: vi.fn(),
  };
  render(<DeckRow deck={deck} {...handlers} />);
  return handlers;
}

describe('DeckRow', () => {
  it('показывает имя и число карточек', () => {
    renderRow();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
    expect(screen.getByText('2 карточки', { exact: false })).toBeInTheDocument();
  });

  it('помечает незавершённую тренировку', () => {
    renderRow({ session: createSession(['c1', 'c2'], 'simple') });
    expect(screen.getByText('тренировка не закончена', { exact: false })).toBeInTheDocument();
  });

  it('без сессии пометки нет', () => {
    renderRow();
    expect(screen.queryByText('тренировка не закончена', { exact: false })).not.toBeInTheDocument();
  });

  it('нажатие на строку открывает колоду', async () => {
    const user = userEvent.setup();
    const { onOpen } = renderRow();
    await user.click(screen.getByRole('button', { name: /^Юнит 1/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('переименование отдаёт новое имя', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать «Юнит 1»' }));

    const field = screen.getByLabelText('Название колоды');
    await user.clear(field);
    await user.type(field, 'Другое имя');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onRename).toHaveBeenCalledWith('Другое имя');
  });

  it('переименование можно отменить', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать «Юнит 1»' }));
    await user.click(screen.getByRole('button', { name: 'отмена' }));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
  });

  it('пустое имя не сохраняется', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать «Юнит 1»' }));
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onRename).not.toHaveBeenCalled();
  });

  it('«Сохранить» отключена, пока поле пустое или из пробелов', async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать «Юнит 1»' }));

    const field = screen.getByLabelText('Название колоды');
    const save = screen.getByRole('button', { name: 'Сохранить' });

    await user.clear(field);
    expect(save).toBeDisabled();

    await user.type(field, '   ');
    expect(save).toBeDisabled();

    await user.type(field, 'Другое имя');
    expect(save).toBeEnabled();
  });

  it('Enter в поле переименования сохраняет имя', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать «Юнит 1»' }));

    const field = screen.getByLabelText('Название колоды');
    await user.clear(field);
    await user.type(field, 'Другое имя{Enter}');

    expect(onRename).toHaveBeenCalledWith('Другое имя');
    expect(screen.queryByLabelText('Название колоды')).not.toBeInTheDocument();
  });

  it('Enter с пустым полем ничего не сохраняет', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать «Юнит 1»' }));

    const field = screen.getByLabelText('Название колоды');
    await user.clear(field);
    await user.keyboard('{Enter}');

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Название колоды')).toBeInTheDocument();
  });

  it('Escape в поле переименования отменяет ввод и восстанавливает исходное имя', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();
    await user.click(screen.getByRole('button', { name: 'переименовать «Юнит 1»' }));

    const field = screen.getByLabelText('Название колоды');
    await user.clear(field);
    await user.type(field, 'Другое имя{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Название колоды')).not.toBeInTheDocument();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
  });

  it('удаление требует подтверждения', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderRow();
    await user.click(screen.getByRole('button', { name: 'удалить «Юнит 1»' }));

    expect(screen.getByText('Удалить вместе с прогрессом?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Удалить «Юнит 1»' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('подтверждение удаления можно отменить', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderRow();
    await user.click(screen.getByRole('button', { name: 'удалить «Юнит 1»' }));
    await user.click(screen.getByRole('button', { name: 'отмена «Юнит 1»' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Удалить вместе с прогрессом?')).not.toBeInTheDocument();
  });

  it('при открытии подтверждения удаления фокус уходит на «отмена», а не на «Удалить»', async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByRole('button', { name: 'удалить «Юнит 1»' }));

    expect(screen.getByRole('button', { name: 'отмена «Юнит 1»' })).toHaveFocus();
  });

  it('выгрузка вызывается сразу', async () => {
    const user = userEvent.setup();
    const { onExport } = renderRow();
    await user.click(screen.getByRole('button', { name: 'выгрузить «Юнит 1»' }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('доступные имена кнопок действий включают название колоды и различают строки', () => {
    const handlers = {
      onOpen: vi.fn(),
      onRename: vi.fn(),
      onDelete: vi.fn(),
      onExport: vi.fn(),
    };
    render(
      <>
        <DeckRow deck={createDeck('Юнит 1', cards, AT)} {...handlers} />
        <DeckRow deck={createDeck('Юнит 2', cards, AT)} {...handlers} />
      </>,
    );

    expect(screen.getByRole('button', { name: 'переименовать «Юнит 1»' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'переименовать «Юнит 2»' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'выгрузить «Юнит 1»' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'выгрузить «Юнит 2»' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'удалить «Юнит 1»' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'удалить «Юнит 2»' })).toBeInTheDocument();
  });
});
