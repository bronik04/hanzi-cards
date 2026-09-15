import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeScreen from '@/screens/ResumeScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import type { Card } from '@/core/deck';
import { createSession } from '@/core/session';

const AT = new Date('2026-09-14T10:00:00Z');

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function resumeState(mode: 'simple' | 'ring' = 'simple'): AppState {
  const deck: Deck = {
    ...createDeck('Тестовая колода', cards, AT),
    startedMode: mode,
    session: createSession(['c1', 'c2'], mode),
  };
  return {
    ...initialState,
    hydrated: true,
    decks: [deck],
    activeDeckId: deck.id,
    screen: 'resume',
  };
}

describe('ResumeScreen', () => {
  it('описывает сохранённую сессию простого режима', () => {
    renderWithProvider(<ResumeScreen />, resumeState('simple'));
    expect(screen.getByText('2 карточки · Круг 1')).toBeInTheDocument();
  });

  it('описывает сохранённую сессию колец', () => {
    renderWithProvider(<ResumeScreen />, resumeState('ring'));
    expect(screen.getByText('2 карточки · Блок 1 из 1')).toBeInTheDocument();
  });

  // Новая колода добавляется к библиотеке и сессию этой колоды не трогает:
  // предупреждать о потере прогресса значит пугать тем, чего не случится.
  it('загрузка новой таблицы не требует подтверждения и не грозит потерей', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ResumeScreen />, resumeState());
    await user.click(screen.getByRole('button', { name: 'Загрузить новую' }));

    expect(screen.queryByText('Прогресс текущей тренировки будет потерян.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Да, загрузить новую' })).not.toBeInTheDocument();
  });

  it('с экрана возобновления есть выход в библиотеку', () => {
    renderWithProvider(<ResumeScreen />, resumeState());
    expect(screen.getByRole('button', { name: 'В библиотеку' })).toBeInTheDocument();
  });
});
