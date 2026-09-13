import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeScreen from '@/screens/ResumeScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import type { Card } from '@/core/deck';
import { createSession } from '@/core/session';

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function resumeState(mode: 'simple' | 'ring' = 'simple'): AppState {
  return {
    ...initialState,
    cards,
    hydrated: true,
    screen: 'resume',
    startedMode: mode,
    session: createSession(['c1', 'c2'], mode),
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

  it('загрузка новой таблицы требует подтверждения', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ResumeScreen />, resumeState());
    await user.click(screen.getByRole('button', { name: 'Загрузить новую' }));
    expect(screen.getByText('Прогресс текущей тренировки будет потерян.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Да, загрузить новую' })).toBeInTheDocument();
  });

  it('подтверждение можно отменить', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ResumeScreen />, resumeState());
    await user.click(screen.getByRole('button', { name: 'Загрузить новую' }));
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByRole('button', { name: 'Да, загрузить новую' })).not.toBeInTheDocument();
  });
});
