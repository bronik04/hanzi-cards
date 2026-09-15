import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainingScreen, { EXIT_DURATION } from '@/screens/TrainingScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import { useAppState, useActiveDeck } from '@/state/AppContext';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import type { Card } from '@/core/deck';
import { createSession, currentCardId } from '@/core/session';

const AT = new Date('2026-09-14T10:00:00Z');

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function trainingState(mode: 'simple' | 'ring' = 'simple'): AppState {
  const deck: Deck = {
    ...createDeck('Тестовая колода', cards, AT),
    startedMode: mode,
    session: createSession(['c1', 'c2'], mode),
  };
  return { ...initialState, hydrated: true, decks: [deck], activeDeckId: deck.id, screen: 'training' };
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

/** Показывает TrainingScreen, пока экран — «training», и рядом — текущий
 *  экран и id карточки сессии. Так «В библиотеку» проверяется не только по
 *  тому, что тренировка исчезла с экрана, но и по тому, что прогресс сессии
 *  активной колоды дожил до этого момента: go-to-mode тоже увёл бы с экрана
 *  тренировки, но обнулил бы сессию. */
function TrainingWithProbe() {
  const { screen: currentScreen } = useAppState();
  const deck = useActiveDeck();
  const cardId = deck?.session === null || deck?.session === undefined ? null : currentCardId(deck.session);
  return (
    <>
      {currentScreen === 'training' && <TrainingScreen />}
      <p data-testid="screen">{currentScreen}</p>
      <p data-testid="card-id">{cardId ?? 'none'}</p>
    </>
  );
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

  it('«В библиотеку» уводит с экрана тренировки, но сохраняет прогресс сессии', async () => {
    const user = userEvent.setup();
    renderWithProvider(<TrainingWithProbe />, trainingState());

    // Продвигаем сессию, чтобы было что терять.
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await screen.findByText('谢谢');
    expect(screen.getByTestId('card-id')).toHaveTextContent('c2');

    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));

    expect(screen.getByTestId('screen')).toHaveTextContent('library');
    // Главное: прогресс не обнулился, как это сделал бы go-to-mode.
    expect(screen.getByTestId('card-id')).toHaveTextContent('c2');
  });

  // Таймер dispatch({type:'swiped'}) стоит EXIT_DURATION мс: клик по выходу
  // раньше, чем он отработает, уводил с экрана и снимался эффектом очистки,
  // так и не дождавшись dispatch — только что сделанный свайп пропадал молча.
  //
  // fireEvent вместо userEvent — нарочно: disabled нужно проверить внутри
  // настоящего 220-мс окна анимации (фейковые таймеры здесь не годятся, см.
  // комментарий выше про их связку с userEvent), а асинхронные накладные
  // расходы userEvent на загруженной машине способны съесть это окно между
  // кликом и проверкой. fireEvent.click синхронный: состояние обновляется
  // до возврата из вызова, и проверка не зависит от реального времени.
  it('«В библиотеку» и «Загрузить новую таблицу» недоступны, пока карточка уезжает: свайп не теряется', async () => {
    renderWithProvider(<TrainingWithProbe />, trainingState());

    fireEvent.click(screen.getByRole('button', { name: 'Знаю' }));

    // Карточка ещё уезжает: выходы недоступны, а не просто отложены.
    const exitButton = screen.getByRole('button', { name: 'В библиотеку' });
    const importButton = screen.getByRole('button', { name: 'Загрузить новую таблицу' });
    expect(exitButton).toBeDisabled();
    expect(importButton).toBeDisabled();

    // Клик по недоступной кнопке ничего не делает — свайп ещё не потерян.
    fireEvent.click(exitButton);
    expect(screen.getByTestId('screen')).toHaveTextContent('training');

    await screen.findByText('谢谢');
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
    expect(exitButton).not.toBeDisabled();
    expect(importButton).not.toBeDisabled();

    fireEvent.click(exitButton);
    expect(screen.getByTestId('screen')).toHaveTextContent('library');
    // Свайп дожил до выхода: счётчик и прогресс сессии не потерялись.
    expect(screen.getByTestId('card-id')).toHaveTextContent('c2');
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
    const state = trainingState();
    const deck = state.decks[0];
    if (deck === undefined) throw new Error('колода не собрана');
    renderWithProvider(<TrainingScreen />, {
      ...state,
      decks: [{ ...deck, cards: [] }],
    });
    expect(screen.getByRole('button', { name: 'В меню' })).toBeInTheDocument();
  });

  it('учитывает направление при отрисовке', () => {
    const state = trainingState();
    const deck = state.decks[0];
    if (deck === undefined) throw new Error('колода не собрана');
    renderWithProvider(<TrainingScreen />, {
      ...state,
      decks: [{ ...deck, direction: 'translation-to-hanzi' }],
    });
    expect(screen.getByText('привет')).toBeInTheDocument();
  });
});
