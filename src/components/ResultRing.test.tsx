import { render, screen } from '@testing-library/react';
import ResultRing from '@/components/ResultRing';

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

describe('ResultRing', () => {
  it('показывает процент', () => {
    mockReducedMotion(true);
    render(<ResultRing percent={86} />);
    expect(screen.getByText('86%')).toBeInTheDocument();
  });

  it('ноль показывается нулём, а не пустотой', () => {
    mockReducedMotion(true);
    render(<ResultRing percent={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  // Кольцо нарисовано графикой, и без роли с именем читалка о нём молчит.
  it('объявляет себя с итоговым значением', () => {
    mockReducedMotion(true);
    render(<ResultRing percent={86} />);
    expect(screen.getByRole('img', { name: 'Верных ответов: 86%' })).toBeInTheDocument();
  });

  // Имя берёт итог, а не текущее значение анимации: читалка произносит его
  // один раз, и произнести она должна результат, а не случайный кадр.
  it('имя не зависит от того, докрутилось ли кольцо', () => {
    mockReducedMotion(false);
    render(<ResultRing percent={86} />);

    expect(screen.getByRole('img', { name: 'Верных ответов: 86%' })).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
