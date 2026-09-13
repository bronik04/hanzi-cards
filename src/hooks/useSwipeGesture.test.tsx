import { fireEvent, render, screen } from '@testing-library/react';
import { SWIPE_THRESHOLD, useSwipeGesture } from '@/hooks/useSwipeGesture';
import type { SwipeDirection } from '@/core/session';

type HarnessProps = {
  onSwipe: (direction: SwipeDirection) => void;
  onFlip: () => void;
  disabled?: boolean;
};

function Harness({ onSwipe, onFlip, disabled = false }: HarnessProps) {
  const { dragX, dragging, handlers } = useSwipeGesture({ onSwipe, onFlip, disabled });
  return (
    <div data-testid="target" {...handlers}>
      <span data-testid="dragX">{dragX}</span>
      <span data-testid="dragging">{String(dragging)}</span>
      <button type="button">Знаю</button>
    </div>
  );
}

function drag(distance: number) {
  const target = screen.getByTestId('target');
  fireEvent.pointerDown(target, { pointerId: 1, clientX: 200 });
  fireEvent.pointerMove(target, { pointerId: 1, clientX: 200 + distance });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: 200 + distance });
}

describe('useSwipeGesture: перетаскивание', () => {
  it('смещение вправо больше порога — свайп вправо', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    drag(SWIPE_THRESHOLD + 1);
    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('смещение влево больше порога — свайп влево', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    drag(-(SWIPE_THRESHOLD + 1));
    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('смещение меньше порога не считается свайпом', () => {
    const onSwipe = vi.fn();
    const onFlip = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={onFlip} />);
    drag(30);
    expect(onSwipe).not.toHaveBeenCalled();
    expect(onFlip).not.toHaveBeenCalled();
  });

  it('нажатие без смещения переворачивает карточку', () => {
    const onFlip = vi.fn();
    render(<Harness onSwipe={vi.fn()} onFlip={onFlip} />);
    drag(0);
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('отражает смещение во время перетаскивания', () => {
    render(<Harness onSwipe={vi.fn()} onFlip={vi.fn()} />);
    const target = screen.getByTestId('target');
    fireEvent.pointerDown(target, { pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 250 });
    expect(screen.getByTestId('dragX')).toHaveTextContent('50');
    expect(screen.getByTestId('dragging')).toHaveTextContent('true');
  });

  it('после отпускания смещение сбрасывается', () => {
    render(<Harness onSwipe={vi.fn()} onFlip={vi.fn()} />);
    drag(100);
    expect(screen.getByTestId('dragX')).toHaveTextContent('0');
    expect(screen.getByTestId('dragging')).toHaveTextContent('false');
  });

  it('отмена указателя сбрасывает перетаскивание без свайпа', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    const target = screen.getByTestId('target');
    fireEvent.pointerDown(target, { pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 400 });
    fireEvent.pointerCancel(target, { pointerId: 1 });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(screen.getByTestId('dragX')).toHaveTextContent('0');
  });
});

describe('useSwipeGesture: клавиатура', () => {
  it('стрелка вправо — свайп вправо', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('стрелка влево — свайп влево', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('пробел переворачивает карточку', () => {
    const onFlip = vi.fn();
    render(<Harness onSwipe={vi.fn()} onFlip={onFlip} />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('не перехватывает клавиши, когда фокус на кнопке', () => {
    const onFlip = vi.fn();
    render(<Harness onSwipe={vi.fn()} onFlip={onFlip} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Знаю' }), { key: 'Enter' });
    expect(onFlip).not.toHaveBeenCalled();
  });
});

describe('useSwipeGesture: блокировка', () => {
  it('в заблокированном состоянии не реагирует ни на что', () => {
    const onSwipe = vi.fn();
    const onFlip = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={onFlip} disabled />);
    drag(200);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(onFlip).not.toHaveBeenCalled();
  });
});
