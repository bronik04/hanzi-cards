import { render, screen } from '@testing-library/react';
import ScreenTransition from '@/components/ScreenTransition';

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

function Pane({ title }: { title: string }) {
  return (
    <section className="screen">
      <h1>{title}</h1>
      <button type="button">Кнопка {title}</button>
    </section>
  );
}

/** Отрендерить экран, затем сменить его на другой. */
function move(from: 'library' | 'mode', to: 'library' | 'mode', titles: [string, string]) {
  const view = render(
    <ScreenTransition screen={from}>
      <Pane title={titles[0]} />
    </ScreenTransition>,
  );
  view.rerender(
    <ScreenTransition screen={to}>
      <Pane title={titles[1]} />
    </ScreenTransition>,
  );
  return view;
}

describe('ScreenTransition', () => {
  it('показывает текущий экран', () => {
    mockReducedMotion(true);
    render(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );
    expect(screen.getByRole('heading', { name: 'Мои колоды' })).toBeInTheDocument();
  });

  // Без этого человек с клавиатурой после перехода остаётся на кнопке,
  // которой больше нет на экране, и следующий Tab уводит в никуда.
  it('после смены экрана фокус уходит на заголовок нового', async () => {
    mockReducedMotion(true);
    move('library', 'mode', ['Мои колоды', 'Колода готова']);

    await vi.waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Колода готова' })).toHaveFocus(),
    );
  });

  it('заголовок не попадает в обход по Tab', async () => {
    mockReducedMotion(true);
    move('library', 'mode', ['Мои колоды', 'Колода готова']);

    await vi.waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Колода готова' })).toHaveAttribute(
        'tabindex',
        '-1',
      ),
    );
  });

  it('задаёт направление вглубь при открытии колоды', () => {
    mockReducedMotion(false);
    const { container } = move('library', 'mode', ['Мои колоды', 'Колода готова']);
    expect(container.querySelector('.transition')).toHaveClass('transition--forward');
  });

  it('задаёт направление назад при возврате в библиотеку', () => {
    mockReducedMotion(false);
    const { container } = move('mode', 'library', ['Колода готова', 'Мои колоды']);
    expect(container.querySelector('.transition')).toHaveClass('transition--back');
  });

  // Уходящий экран виден, но не должен ловить фокус и не должен читаться:
  // иначе на странице два заголовка первого уровня и две одинаковые кнопки.
  it('уходящий экран недоступен фокусу и читалке', () => {
    mockReducedMotion(false);
    const { container } = move('library', 'mode', ['Мои колоды', 'Колода готова']);

    const leaving = container.querySelector('.transition__pane--leaving');
    expect(leaving).not.toBeNull();
    expect(leaving).toHaveAttribute('inert');
    expect(leaving).toHaveAttribute('aria-hidden', 'true');
  });

  it('заголовок уходящего экрана не виден поиску по роли', () => {
    mockReducedMotion(false);
    move('library', 'mode', ['Мои колоды', 'Колода готова']);

    // Ровно одна кнопка и один заголовок доступны — иначе getByRole в тестах
    // приложения начнёт находить по два элемента.
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  // При отключённом движении второго экрана в DOM быть не должно вовсе.
  it('с prefers-reduced-motion уходящий экран не рисуется', () => {
    mockReducedMotion(true);
    const { container } = move('library', 'mode', ['Мои колоды', 'Колода готова']);
    expect(container.querySelector('.transition__pane--leaving')).toBeNull();
  });

  it('перерисовка того же экрана переход не запускает', () => {
    mockReducedMotion(false);
    const { container, rerender } = render(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );
    rerender(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды: 3 колоды" />
      </ScreenTransition>,
    );

    expect(container.querySelector('.transition__pane--leaving')).toBeNull();
  });
});
