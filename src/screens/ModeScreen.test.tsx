import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModeScreen from '@/screens/ModeScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import type { Card } from '@/core/deck';

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function stateWith(overrides: Partial<AppState> = {}): AppState {
  return { ...initialState, cards, hydrated: true, screen: 'mode', ...overrides };
}

describe('ModeScreen', () => {
  it('показывает размер колоды', () => {
    renderWithProvider(<ModeScreen />, stateWith());
    expect(screen.getByRole('heading', { name: 'Колода готова: 2 карточки' })).toBeInTheDocument();
  });

  it('предлагает три направления', () => {
    renderWithProvider(<ModeScreen />, stateWith());
    expect(screen.getByLabelText('Иероглиф → перевод')).toBeInTheDocument();
    expect(screen.getByLabelText('Перевод → иероглиф')).toBeInTheDocument();
    expect(screen.getByLabelText('Иероглиф → пиньинь')).toBeInTheDocument();
  });

  it('отмечает текущее направление', () => {
    renderWithProvider(<ModeScreen />, stateWith({ direction: 'translation-to-hanzi' }));
    expect(screen.getByLabelText('Перевод → иероглиф')).toBeChecked();
  });

  it('выключает направление на пиньинь для колоды без пиньиня', () => {
    const withoutPinyin = cards.map((card) => ({ ...card, pinyin: '' }));
    renderWithProvider(<ModeScreen />, stateWith({ cards: withoutPinyin }));
    expect(screen.getByLabelText('Иероглиф → пиньинь')).toBeDisabled();
    expect(screen.getByText('В колоде нет пиньиня')).toBeInTheDocument();
  });

  it('смена направления отражается в отметке', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ModeScreen />, stateWith());
    await user.click(screen.getByLabelText('Иероглиф → пиньинь'));
    expect(screen.getByLabelText('Иероглиф → пиньинь')).toBeChecked();
  });

  it('предлагает оба режима тренировки', () => {
    renderWithProvider(<ModeScreen />, stateWith());
    expect(screen.getByRole('button', { name: 'Простой просмотр' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Заучивание кольцами по 7' })).toBeInTheDocument();
  });

  it('даёт ссылку на загрузку новой таблицы', () => {
    renderWithProvider(<ModeScreen />, stateWith());
    expect(screen.getByRole('button', { name: 'Загрузить новую таблицу' })).toBeInTheDocument();
  });
});
