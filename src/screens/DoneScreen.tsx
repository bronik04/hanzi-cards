import Counters from '@/components/Counters';
import ResultRing from '@/components/ResultRing';
import { cardsCount } from '@/core/plural';
import { useCountUp } from '@/hooks/useCountUp';
import { useActiveDeck, useAppDispatch } from '@/state/AppContext';

const COUNT_UP_MS = 1400;

export default function DoneScreen() {
  const deck = useActiveDeck();
  const dispatch = useAppDispatch();
  // Хуки до раннего возврата: порядок вызова обязан быть постоянным.
  // Счётчики набегают вместе с кольцом — сам Counters остаётся простым,
  // иначе он начал бы набегать и на экране тренировки после каждого свайпа.
  const known = useCountUp(deck?.stats.known ?? 0, COUNT_UP_MS);
  const unknown = useCountUp(deck?.stats.unknown ?? 0, COUNT_UP_MS);
  if (deck === null) return null;
  const { cards, stats, startedMode } = deck;

  return (
    <section className="screen">
      <h1>Готово</h1>
      <p className="done__info">{cardsCount(cards.length)}</p>

      <ResultRing percent={percentKnown(stats)} />
      <Counters known={known} unknown={unknown} />

      <div className="done__buttons">
        <button
          type="button"
          className="btn"
          onClick={() => dispatch({ type: 'session-started', mode: startedMode })}
        >
          Начать заново
        </button>
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => dispatch({ type: 'go-to-library' })}
        >
          В библиотеку
        </button>
      </div>
    </section>
  );
}

/** Доля верных за тренировку. Без ответов — ноль, а не деление на ноль. */
function percentKnown({ known, unknown }: { known: number; unknown: number }): number {
  const total = known + unknown;
  return total === 0 ? 0 : Math.round((known / total) * 100);
}
