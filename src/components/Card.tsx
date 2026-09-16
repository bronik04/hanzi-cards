import type { CSSProperties, PointerEventHandler } from 'react';
import type { CardFace } from '@/core/deck';
import type { SwipeDirection } from '@/core/session';
import { SWIPE_THRESHOLD } from '@/hooks/useSwipeGesture';

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

  // Непрерывный рост вместо ступеньки: подкраска достигает максимума ровно
  // там, где отпускание засчитает свайп. Раньше цвет включался скачком на
  // двадцати пикселях и до самого порога врал, что свайп уже состоялся.
  const strength = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
  const tintYes = exiting === 'right' ? 1 : dragX > 0 ? strength : 0;
  const tintNo = exiting === 'left' ? 1 : dragX < 0 ? strength : 0;

  const className = ['card', dragging ? 'card--dragging' : '', exiting !== null ? 'card--exiting' : '']
    .filter((name) => name !== '')
    .join(' ');

  return (
    <div
      className={className}
      style={
        {
          transform: `translateX(${offset}px) rotate(${offset / 20}deg)`,
          '--tint-yes': tintYes,
          '--tint-no': tintNo,
        } as CSSProperties
      }
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Обратная сторона карточки' : 'Лицевая сторона карточки'}
      {...handlers}
    >
      <div className="card__tint card__tint--yes" aria-hidden="true" />
      <div className="card__tint card__tint--no" aria-hidden="true" />
      {/* Штампы скрыты от читалки намеренно: направление задаётся стрелками
          с клавиатуры, а результат сообщают счётчики, а не надпись. */}
      <div className="card__stamp card__stamp--yes" aria-hidden="true">
        ЗНАЮ
      </div>
      <div className="card__stamp card__stamp--no" aria-hidden="true">
        СНОВА
      </div>

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
