import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainingScreen, { EXIT_DURATION } from '@/screens/TrainingScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import type { Card } from '@/core/deck';
import { createSession } from '@/core/session';

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function trainingState(mode: 'simple' | 'ring' = 'simple'): AppState {
  return {
    ...initialState,
    cards,
    hydrated: true,
    screen: 'training',
    startedMode: mode,
    session: createSession(['c1', 'c2'], mode),
  };
}

// Фейковые таймеры здесь не используются: userEvent с ними намертво зависает
// в этой связке версий. Ожидание через findBy* заодно развязывает тесты
// с точной длительностью анимации ухода карточки.

/** Свайп клавишей с промоткой анимации. Без userEvent: он несовместим
 *  с фейковыми таймерами в этой связке версий. */
function swipeWithTimers(key: string) {
  fireEvent.keyDown(window, { key });
  act(() => {
    vi.advanceTimersByTime(EXIT_DURATION + 10);
  });
}

describe('TrainingScreen', () => {
  it('показывает лицевую сторону текущей карточки', () => {
    renderWithProvider(<TrainingScreen />, trainingState());
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('кнопка «Знаю» переводит к следующей карточке', async () => {
    const user = userEvent.setup();
    renderWithProvider(<TrainingScreen />, trainingState());
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    expect(await screen.findByText('谢谢')).toBeInTheDocument();
    expect(screen.queryByText('你好')).not.toBeInTheDocument();
  });

  it('свайп вправо увеличивает счётчик «знаю»', async () => {
    const user = userEvent.setup();
    renderWithProvider(<TrainingScreen />, trainingState());
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
    expect(screen.getByTestId('count-unknown')).toHaveTextContent('0');
  });

  it('«Изучать снова» увеличивает счётчик «не знаю»', async () => {
    const user = userEvent.setup();
    renderWithProvider(<TrainingScreen />, trainingState());
    await user.click(screen.getByRole('button', { name: 'Изучать снова' }));
    await screen.findByText('谢谢');
    expect(screen.getByTestId('count-unknown')).toHaveTextContent('1');
  });

  it('стрелка вправо работает как свайп', async () => {
    renderWithProvider(<TrainingScreen />, trainingState());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(await screen.findByText('谢谢')).toBeInTheDocument();
  });

  it('во время анимации ввод заблокирован', async () => {
    const user = userEvent.setup();
    renderWithProvider(<TrainingScreen />, trainingState());
    // Второе нажатие приходится на 220 мс анимации и должно быть проглочено.
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
  });

  it('новая карточка показывается лицевой стороной', async () => {
    const user = userEvent.setup();
    renderWithProvider(<TrainingScreen />, trainingState());
    await user.click(screen.getByRole('button', { name: 'Показать ответ' }));
    expect(screen.getByText('привет')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');
    expect(screen.queryByText('спасибо')).not.toBeInTheDocument();
  });

  it('показывает прогресс круга в простом режиме', () => {
    renderWithProvider(<TrainingScreen />, trainingState('simple'));
    expect(screen.getByText('Круг 1 · осталось 2')).toBeInTheDocument();
  });

  it('показывает номер блока в режиме колец', () => {
    renderWithProvider(<TrainingScreen />, trainingState('ring'));
    expect(screen.getByText('Блок 1 из 1 · осталось 2')).toBeInTheDocument();
  });

  it('Esc предлагает выйти в меню', () => {
    renderWithProvider(<TrainingScreen />, trainingState());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByText('Выйти в меню? Прогресс тренировки будет потерян.')).toBeInTheDocument();
  });

  it('подтверждение выхода можно отменить', async () => {
    const user = userEvent.setup();
    renderWithProvider(<TrainingScreen />, trainingState());
    await user.click(screen.getByRole('button', { name: 'Закрыть тренировку' }));
    await user.click(screen.getByRole('button', { name: 'Остаться' }));
    expect(
      screen.queryByText('Выйти в меню? Прогресс тренировки будет потерян.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('во время подтверждения свайпы не работают', () => {
    renderWithProvider(<TrainingScreen />, trainingState());
    fireEvent.keyDown(window, { key: 'Escape' });
    // Отдельный вызов: обработчик клавиш переподписывается только после рендера.
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('баннер смены круга исчезает, даже если свайпнуть снова', () => {
    vi.useFakeTimers();
    try {
      renderWithProvider(<TrainingScreen />, trainingState());

      // Влево, вправо, вправо — круг закрыт с ошибкой, начинается круг 2.
      swipeWithTimers('ArrowLeft');
      swipeWithTimers('ArrowRight');
      swipeWithTimers('ArrowRight');
      expect(screen.getByText('Круг 2')).toBeInTheDocument();

      // Свайп внутри того же круга раньше, чем баннер успел погаснуть.
      swipeWithTimers('ArrowRight');
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Круг 2')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('слот баннера всегда в разметке: меняется только текст', () => {
    vi.useFakeTimers();
    try {
      renderWithProvider(<TrainingScreen />, trainingState());

      const banner = screen.getByTestId('stage-banner');
      expect(banner).toBeEmptyDOMElement();
      // Живой регион озвучивает смену круга только если он был в DOM заранее.
      expect(banner).toHaveAttribute('aria-live', 'polite');

      // Влево, вправо, вправо — круг закрыт с ошибкой, начинается круг 2.
      swipeWithTimers('ArrowLeft');
      swipeWithTimers('ArrowRight');
      swipeWithTimers('ArrowRight');

      // Ссылка на тот же узел, а не новый поиск: если баннер снова начнут
      // монтировать по условию, здесь окажется отсоединённый пустой абзац.
      expect(banner).toHaveTextContent('Круг 2');

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(banner).toBeEmptyDOMElement();
      expect(screen.getByTestId('stage-banner')).toBe(banner);
    } finally {
      vi.useRealTimers();
    }
  });

  it('показывает выход, если карточка сессии не найдена', () => {
    renderWithProvider(<TrainingScreen />, { ...trainingState(), cards: [] });
    expect(screen.getByRole('button', { name: 'В меню' })).toBeInTheDocument();
  });

  it('учитывает направление при отрисовке', () => {
    renderWithProvider(<TrainingScreen />, {
      ...trainingState(),
      direction: 'translation-to-hanzi',
    });
    expect(screen.getByText('привет')).toBeInTheDocument();
  });
});
