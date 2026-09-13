import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CardPointerHandlers } from '@/components/Card';
import type { SwipeDirection } from '@/core/session';

export const SWIPE_THRESHOLD = 80;

/** Смещение, ниже которого отпускание считается нажатием, а не перетаскиванием. */
const TAP_TOLERANCE = 5;

const TYPING_TAGS = new Set(['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']);

type Options = {
  onSwipe: (direction: SwipeDirection) => void;
  onFlip: () => void;
  disabled: boolean;
};

export function useSwipeGesture({ onSwipe, onFlip, disabled }: Options): {
  dragX: number;
  dragging: boolean;
  handlers: CardPointerHandlers;
} {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const activePointer = useRef<number | null>(null);

  const reset = useCallback(() => {
    activePointer.current = null;
    setDragging(false);
    setDragX(0);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      activePointer.current = event.pointerId;
      startX.current = event.clientX;
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || activePointer.current !== event.pointerId) return;
      setDragX(event.clientX - startX.current);
    },
    [disabled],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointer.current !== event.pointerId) return;
      const distance = event.clientX - startX.current;
      reset();
      if (disabled) return;

      // Одна точка входа для свайпа и переворота: отдельный обработчик клика
      // давал гонку с перетаскиванием.
      if (distance > SWIPE_THRESHOLD) {
        onSwipe('right');
      } else if (distance < -SWIPE_THRESHOLD) {
        onSwipe('left');
      } else if (Math.abs(distance) <= TAP_TOLERANCE) {
        onFlip();
      }
    },
    [disabled, onFlip, onSwipe, reset],
  );

  const onPointerCancel = useCallback(() => reset(), [reset]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (disabled) return;
      // Кнопки обрабатывают Enter и пробел сами — иначе сработает дважды.
      const target = event.target;
      if (target instanceof HTMLElement && TYPING_TAGS.has(target.tagName)) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onSwipe('right');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onSwipe('left');
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onFlip();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onFlip, onSwipe]);

  return {
    dragX,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
