import { screen } from '@testing-library/react';
import LibraryScreen from '@/screens/LibraryScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';

describe('LibraryScreen', () => {
  it('показывает подсказку, если колод нет', () => {
    renderWithProvider(<LibraryScreen />, { ...initialState, hydrated: true, screen: 'library' });
    expect(
      screen.getByText('Пока ни одной колоды. Добавьте первую — вставьте таблицу со словами.'),
    ).toBeInTheDocument();
  });
});
