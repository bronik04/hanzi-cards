import { createContext, useContext, useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
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

describe('ScreenTransition, уходящий экран — снимок', () => {
  // Состояние приходит через контекст, а не пропсом: именно так его читают
  // настоящие экраны, и именно поэтому пересборка уходящей панели опасна —
  // новый экземпляр видит состояние на момент перехода, а не на момент,
  // когда экран был виден.
  const Finished = createContext(false);

  function Training() {
    const finished = useContext(Finished);
    return (
      <section className="screen">
        <h1>Тренировка</h1>
        {finished ? <p>Тренировка прервана</p> : <p>你好</p>}
      </section>
    );
  }

  it('показывает то, что было на экране, а не то, что стало с состоянием', () => {
    mockReducedMotion(false);
    const { container, rerender } = render(
      <Finished.Provider value={false}>
        <ScreenTransition screen="training">
          <Training />
        </ScreenTransition>
      </Finished.Provider>,
    );

    // Последний свайп: сессия закончена, экран уходит на итоги.
    rerender(
      <Finished.Provider value>
        <ScreenTransition screen="done">
          <section className="screen">
            <h1>Готово</h1>
          </section>
        </ScreenTransition>
      </Finished.Provider>,
    );

    const leaving = container.querySelector('.transition__pane--leaving');
    expect(leaving?.textContent).toContain('你好');
    expect(leaving?.textContent).not.toContain('Тренировка прервана');
  });

  // Пересобранный экземпляр вешал бы на window свои обработчики клавиш:
  // у экрана тренировки их два, и стрелка за время перехода уходила бы
  // свайпом в уже законченную сессию.
  it('снимок не монтирует компонент заново и не вешает обработчиков', () => {
    mockReducedMotion(false);
    const mounted = vi.fn();

    function WithListener() {
      useEffect(() => {
        mounted();
      }, []);
      return (
        <section className="screen">
          <h1>Экран</h1>
        </section>
      );
    }

    const { rerender } = render(
      <ScreenTransition screen="library">
        <WithListener />
      </ScreenTransition>,
    );
    expect(mounted).toHaveBeenCalledTimes(1);

    rerender(
      <ScreenTransition screen="mode">
        <Pane title="Колода готова" />
      </ScreenTransition>,
    );

    expect(mounted).toHaveBeenCalledTimes(1);
  });
});

describe('ScreenTransition, крайние случаи', () => {
  it('на первой отрисовке фокус не забирается', () => {
    mockReducedMotion(true);
    render(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );

    // Экран никто не менял: увод фокуса при загрузке страницы читается
    // как подёргивание и сбивает обход с клавиатуры.
    expect(document.body).toHaveFocus();
  });

  it('включение «уменьшить движение» посреди перехода убирает уходящий экран', () => {
    // Мок с живым слушателем: простая подмена matchMedia до смонтированного
    // хука не доходит, и тест проверял бы не то, что заявляет.
    let listener: ((event: MediaQueryListEvent) => void) | null = null;
    const mql = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => {
        listener = fn;
      },
      removeEventListener: () => {
        listener = null;
      },
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql),
    );

    const { container, rerender } = render(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );
    rerender(
      <ScreenTransition screen="mode">
        <Pane title="Колода готова" />
      </ScreenTransition>,
    );
    expect(container.querySelector('.transition__pane--leaving')).not.toBeNull();

    // Настройку переключили, пока панель ещё уезжает.
    act(() => {
      mql.matches = true;
      listener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(container.querySelector('.transition__pane--leaving')).toBeNull();
  });
});

describe('ScreenTransition, снимок не дублирует уникальное', () => {
  function WithIds() {
    return (
      <section className="screen">
        <h1>Тренировка</h1>
        <span data-testid="count-known">9</span>
        <input id="field" name="direction" type="radio" readOnly checked />
      </section>
    );
  }

  it('из снимка убраны id, name и data-testid', () => {
    mockReducedMotion(false);
    const { container, rerender } = render(
      <ScreenTransition screen="training">
        <WithIds />
      </ScreenTransition>,
    );
    rerender(
      <ScreenTransition screen="done">
        <Pane title="Готово" />
      </ScreenTransition>,
    );

    const leaving = container.querySelector('.transition__pane--leaving');
    expect(leaving?.textContent).toContain('9');
    expect(leaving?.querySelector('[data-testid]')).toBeNull();
    expect(leaving?.querySelector('[id]')).toBeNull();
    expect(leaving?.querySelector('[name]')).toBeNull();
    // В документе остаётся ровно один элемент с этим testid — иначе
    // строгий поиск в сквозных тестах находит два.
    expect(container.querySelectorAll('[data-testid="count-known"]')).toHaveLength(0);
  });
});
