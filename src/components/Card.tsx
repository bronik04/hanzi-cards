import type { PointerEventHandler } from 'react';
import type { CardFace } from '@/core/deck';
import type { SwipeDirection } from '@/core/session';

export type CardPointerHandlers = {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
};

type CardProps = {
  front: CardFace;
  back: CardFace;
  flipped: boolean;
  dragX: number;
  dragging: boolean;
  exiting: SwipeDirection | null;
  handlers: CardPointerHandlers;
};

const EXIT_DISTANCE = 1200;
const TINT_THRESHOLD = 20;

export default function Card({
  front,
  back,
  flipped,
  dragX,
  dragging,
  exiting,
  handlers,
}: CardProps) {
  const face = flipped ? back : front;
  const offset = exiting === null ? dragX : (exiting === 'right' ? 1 : -1) * EXIT_DISTANCE;

  const className = [
    'card',
    dragging ? 'card--dragging' : '',
    exiting !== null ? 'card--exiting' : '',
    dragX > TINT_THRESHOLD || exiting === 'right' ? 'card--yes' : '',
    dragX < -TINT_THRESHOLD || exiting === 'left' ? 'card--no' : '',
  ]
    .filter((name) => name !== '')
    .join(' ');

  return (
    <div
      className={className}
      style={{ transform: `translateX(${offset}px) rotate(${offset / 20}deg)` }}
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Обратная сторона карточки' : 'Лицевая сторона карточки'}
      {...handlers}
    >
      <div className="card__body" aria-live="polite">
        <p className={face.mainIsHanzi ? 'card__main card__main--hanzi' : 'card__main'}>
          {face.main}
        </p>
        {face.secondary !== '' && <p className="card__secondary">{face.secondary}</p>}
        {face.tertiary !== '' && <p className="card__tertiary">{face.tertiary}</p>}
      </div>
    </div>
  );
}
