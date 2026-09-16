import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModeTile from '@/components/ModeTile';

describe('ModeTile', () => {
  it('показывает название и пояснение', () => {
    render(
      <ModeTile mode="simple" name="Просмотр" hint="Один круг, без повторов" onStart={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /Просмотр/ })).toBeInTheDocument();
    expect(screen.getByText('Один круг, без повторов')).toBeInTheDocument();
  });

  it('запускает режим по нажатию', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<ModeTile mode="ring" name="Кольца по 7" hint="Блоками" onStart={onStart} />);

    await user.click(screen.getByRole('button', { name: /Кольца по 7/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  // Цвет — часть опознания режима, и на Этапе 2b режимов станет шесть.
  // Класс проверяется, потому что от него зависит, какой цвет возьмёт плитка.
  it('берёт класс по режиму', () => {
    const { rerender } = render(
      <ModeTile mode="simple" name="Просмотр" hint="" onStart={vi.fn()} />,
    );
    expect(screen.getByRole('button')).toHaveClass('mode-tile--simple');

    rerender(<ModeTile mode="ring" name="Кольца по 7" hint="" onStart={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveClass('mode-tile--ring');
  });

  // Пояснение — часть доступного имени: без него читалка произносит только
  // «Просмотр», и чем он отличается от колец, неясно.
  it('пояснение входит в доступное имя', () => {
    render(
      <ModeTile mode="simple" name="Просмотр" hint="Один круг, без повторов" onStart={vi.fn()} />,
    );
    expect(screen.getByRole('button')).toHaveAccessibleName('Просмотр. Один круг, без повторов');
  });

  it('без пояснения доступное имя — одно название', () => {
    render(<ModeTile mode="simple" name="Просмотр" hint="" onStart={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Просмотр');
  });
});
