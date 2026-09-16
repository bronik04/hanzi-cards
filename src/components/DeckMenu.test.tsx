import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeckMenu from '@/components/DeckMenu';

const ITEMS = [
  { id: 'rename', label: 'Переименовать' },
  { id: 'export', label: 'Выгрузить таблицей' },
  { id: 'delete', label: 'Удалить', danger: true },
];

function setup(onSelect = vi.fn()) {
  const user = userEvent.setup();
  render(<DeckMenu label="Действия с колодой «Юнит 1»" items={ITEMS} onSelect={onSelect} />);
  return { user, onSelect, button: screen.getByRole('button', { name: /Действия с колодой/ }) };
}

describe('DeckMenu', () => {
  it('до открытия пунктов нет', () => {
    setup();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('кнопка объявляет, что за ней меню и закрыто ли оно', async () => {
    const { user, button } = setup();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('открывается кликом и показывает все пункты', async () => {
    const { user, button } = setup();
    await user.click(button);

    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Переименовать',
      'Выгрузить таблицей',
      'Удалить',
    ]);
  });

  // Без этого человек с клавиатурой не узнаёт, что меню открылось.
  it('при открытии фокус уходит на первый пункт', async () => {
    const { user, button } = setup();
    await user.click(button);
    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).toHaveFocus();
  });

  it('открывается с клавиатуры', async () => {
    const { user, button } = setup();
    button.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).toHaveFocus();
  });

  it('стрелка вниз ведёт по пунктам и заворачивает на первый', async () => {
    const { user, button } = setup();
    await user.click(button);

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Выгрузить таблицей' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).toHaveFocus();
  });

  it('стрелка вверх с первого пункта заворачивает на последний', async () => {
    const { user, button } = setup();
    await user.click(button);

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toHaveFocus();
  });

  it('выбор пункта сообщает его идентификатор и закрывает меню', async () => {
    const { user, button, onSelect } = setup();
    await user.click(button);
    await user.click(screen.getByRole('menuitem', { name: 'Выгрузить таблицей' }));

    expect(onSelect).toHaveBeenCalledWith('export');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('Escape закрывает меню и возвращает фокус на кнопку', async () => {
    const { user, button } = setup();
    await user.click(button);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  // Фокус обязан вернуться и здесь: иначе после выбора пункта он падает на
  // body, и следующий Tab начинает обход страницы заново.
  it('после выбора пункта фокус возвращается на кнопку', async () => {
    const { user, button } = setup();
    await user.click(button);
    await user.click(screen.getByRole('menuitem', { name: 'Переименовать' }));

    expect(button).toHaveFocus();
  });

  it('клик мимо закрывает меню и ничего не выбирает', async () => {
    const { user, button, onSelect } = setup();
    await user.click(button);
    await user.click(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('опасный пункт помечен для стилей', async () => {
    const { user, button } = setup();
    await user.click(button);

    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toHaveClass('menu__item--danger');
    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).not.toHaveClass(
      'menu__item--danger',
    );
  });
});
