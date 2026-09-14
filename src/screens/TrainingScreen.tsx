import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from '@/components/Card';
import Counters from '@/components/Counters';
import RingProgress from '@/components/RingProgress';
import SimpleProgress from '@/components/SimpleProgress';
import { backFace, frontFace } from '@/core/deck';
import type { Card as CardType } from '@/core/deck';
import { NO_STATS } from '@/core/library';
import { currentCardId, ringProgress, roundProgress, stageLabel } from '@/core/session';
import type { Session, SwipeDirection } from '@/core/session';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useActiveDeck, useAppDispatch } from '@/state/AppContext';

/** Пустая колода одним объектом на весь модуль: новый литерал на каждый
 *  рендер сбрасывал бы useMemo с картой карточек. */
const NO_CARDS: CardType[] = [];

/** Совпадает с длительностью перехода .card в app.css. */
export const EXIT_DURATION = 220;
const BANNER_DURATION = 1800;

export default function TrainingScreen() {
  const deck = useActiveDeck();
  const cards = deck?.cards ?? NO_CARDS;
  const direction = deck?.direction ?? 'hanzi-to-translation';
  const session = deck?.session ?? null;
  const stats = deck?.stats ?? NO_STATS;
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

  // Зависимости — только строки, а не объект сессии. Сессия становится новым
  // объектом после каждого свайпа, и эффект перезапускался бы, гася таймер
  // баннера и не заводя новый: баннер висел бы до следующей смены круга.
  // stageName меняется ровно тогда же, когда stageKey, так что это тот же ключ.
  const stageName = session === null ? '' : stageLabel(session);

  useEffect(() => {
    if (stageName === '' || previousStage.current === stageKey) return;
    previousStage.current = stageKey;
    setBanner(stageName);
    const timer = window.setTimeout(() => setBanner(''), BANNER_DURATION);
    return () => window.clearTimeout(timer);
  }, [stageKey, stageName]);

  if (session === null) return null;

  // Сессия ссылается на карточку, которой нет в колоде. Хранилище такие
  // состояния отвергает, но показать пустую страницу без выхода нельзя ни при
  // каких обстоятельствах.
  if (card === undefined) {
    return (
      <section className="screen">
        <h1>Тренировка прервана</h1>
        <p className="training__progress">Карточка не найдена в колоде.</p>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'go-to-mode' })}>
          В меню
        </button>
      </section>
    );
  }

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

      {/* Слот рендерится всегда: монтирование по условию сдвигало бы
          карточку и кнопки под ней на строку. Высота слота держится
          в CSS, живой регион работает только если элемент уже в DOM. */}
      <p className="training__banner" data-testid="stage-banner" aria-live="polite">
        {banner}
      </p>

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

function progressText(session: Session): string {
  const remaining = session.mode === 'ring' ? ringProgress(session).remaining : session.queue.length;
  return `${stageLabel(session)} · осталось ${remaining}`;
}
