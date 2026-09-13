import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('App', () => {
  it('отрисовывает заголовок', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Карточки 汉字' })).toBeInTheDocument();
  });
});
