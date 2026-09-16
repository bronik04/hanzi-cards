import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DoneScreen from '@/screens/DoneScreen';
import LibraryScreen from '@/screens/LibraryScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import { useAppState } from '@/state/AppContext';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import type { Card } from '@/core/deck';

const AT = new Date('2026-09-14T10:00:00Z');

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function stateWith(overrides: Partial<Deck> = {}): AppState {
  const deck: Deck = {
    ...createDeck('Тестовая колода', cards, AT),
    stats: { known: 1, unknown: 1 },
    ...overrides,
  };
  return { ...initialState, hydrated: true, decks: [deck], activeDeckId: deck.id, screen: 'done' };
}

/** Показывает DoneScreen, а после go-to-library — реальную LibraryScreen: только
 *  так «В библиотеку» проверяется не по названию кнопки, а по факту перехода. */
function DoneOrLibrary() {
  const { screen: currentScreen } = useAppState();
  return currentScreen === 'library' ? <LibraryScreen /> : <DoneScreen />;
}

describe('DoneScreen', () => {
  it('показывает размер колоды и счётчики', () => {
    renderWithProvider(<DoneScreen />, stateWith());
    expect(screen.getByRole('heading', { name: 'Готово' })).toBeInTheDocument();
    expect(screen.getByText('2 карточки')).toBeInTheDocument();
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
    expect(screen.getByTestId('count-unknown')).toHaveTextContent('1');
    expect(screen.getByRole('img', { name: 'Верных ответов: 50%' })).toBeInTheDocument();
  });

  it('«В библиотеку» ведёт в библиотеку', async () => {
    const user = userEvent.setup();
    renderWithProvider(<DoneOrLibrary />, stateWith());
    await user.click(screen.getByRole('button', { name: 'В библиотеку' }));
    expect(screen.getByRole('heading', { name: 'Мои колоды' })).toBeInTheDocument();
  });
});
