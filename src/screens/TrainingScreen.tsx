import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from '@/components/Card';
import Counters from '@/components/Counters';
import RingProgress from '@/components/RingProgress';
import SimpleProgress from '@/components/SimpleProgress';
import { backFace, frontFace } from '@/core/deck';
import { currentCardId, ringProgress, roundProgress } from '@/core/session';
import type { Session, SwipeDirection } from '@/core/session';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useAppDispatch, useAppState } from '@/state/AppContext';

/** Совпадает с длительностью перехода .card в app.css. */
export const EXIT_DURATION = 220;
const BANNER_DURATION = 1800;

export default function TrainingScreen() {
  const { cards, direction, session, stats } = useAppState();
  const dispatch = useAppDispatch();

  const [flipped, setFlipped] = useState(false);
  const [exiting, setExiting] = useState<SwipeDirection | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const exitTimer = useRef<number | null>(null);

  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const cardId = session === null ? null : currentCardId(session);
  const card = cardId === null ? undefined : byId.get(cardId);

  const commitSwipe = useCallback(
    (swipeDirection: SwipeDirection) => {
      // Пока карточка уезжает, второй свайп игнорируется.
      if (exitTimer.current !== null) return;
      setExiting(swipeDirection);
      exitTimer.current = window.setTimeout(() => {
        exitTimer.current = null;
        setExiting(null);
        setFlipped(false);
        dispatch({ type: 'swiped', direction: swipeDirection });
      }, EXIT_DURATION);
    },
    [dispatch],
  );

  const flip = useCallback(() => setFlipped((value) => !value), []);

  const { dragX, dragging, handlers } = useSwipeGesture({
    onSwipe: commitSwipe,
    onFlip: flip,
    disabled: exiting !== null || confirmExit,
  });

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setConfirmExit(true);
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(
    () => () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const stageKey = session === null ? '' : stageKeyOf(session);
  const [banner, setBanner] = useState('');
  const previousStage = useRef(stageKey);

  useEffect(() => {
    if (session === null || previousStage.current === stageKey) return;
    previousStage.current = stageKey;
    setBanner(stageLabel(session));
    const timer = window.setTimeout(() => setBanner(''), BANNER_DURATION);
    return () => window.clearTimeout(timer);
  }, [stageKey, session]);

  if (session === null || card === undefined) return null;

  return (
    <section className="screen screen--training">
      <header className="training__header">
        <button
          type="button"
          className="icon-btn"
          aria-label="Закрыть тренировку"
          onClick={() => setConfirmExit(true)}
        >
          ×
        </button>
        <p className="training__progress">{progressText(session)}</p>
      </header>

      {confirmExit && (
        <div className="training__confirm" role="dialog" aria-label="Выход из тренировки">
          <p>Выйти в меню? Прогресс тренировки будет потерян.</p>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'go-to-mode' })}>
            Выйти
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => setConfirmExit(false)}>
            Остаться
          </button>
        </div>
      )}

      {session.mode === 'simple' ? (
        <SimpleProgress {...roundProgress(session)} />
      ) : (
        <RingProgress {...ringProgress(session)} />
      )}

      <Counters known={stats.known} unknown={stats.unknown} />

      {banner !== '' && <p className="training__banner">{banner}</p>}

      <Card
        front={frontFace(card, direction)}
        back={backFace(card, direction)}
        flipped={flipped}
        dragX={dragX}
        dragging={dragging}
        exiting={exiting}
        handlers={handlers}
      />

      <div className="training__buttons">
        <button type="button" className="btn btn--quiet" onClick={flip}>
          {flipped ? 'Скрыть ответ' : 'Показать ответ'}
        </button>
        <button type="button" className="btn" onClick={() => commitSwipe('left')}>
          Изучать снова
        </button>
        <button type="button" className="btn" onClick={() => commitSwipe('right')}>
          Знаю
        </button>
      </div>

      <button
        type="button"
        className="link-button"
        onClick={() => dispatch({ type: 'go-to-import' })}
      >
        Загрузить новую таблицу
      </button>
    </section>
  );
}

function stageKeyOf(session: Session): string {
  return session.mode === 'ring'
    ? `ring-${session.blockIndex}`
    : `round-${session.round}-${String(session.finalRound)}`;
}

function stageLabel(session: Session): string {
  if (session.mode === 'ring') return `Блок ${session.blockIndex + 1}`;
  if (session.finalRound) return 'Сводный круг';
  return `Круг ${session.round}`;
}

function progressText(session: Session): string {
  if (session.mode === 'ring') {
    const { blockIndex, blockCount, remaining } = ringProgress(session);
    return `Блок ${blockIndex + 1} из ${blockCount} · осталось ${remaining}`;
  }
  const stage = session.finalRound ? 'Сводный круг' : `Круг ${session.round}`;
  return `${stage} · осталось ${session.queue.length}`;
}
