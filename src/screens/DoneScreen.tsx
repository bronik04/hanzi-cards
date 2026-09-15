import { cardsCount } from '@/core/plural';
import { useActiveDeck, useAppDispatch } from '@/state/AppContext';

export default function DoneScreen() {
  const deck = useActiveDeck();
  const dispatch = useAppDispatch();
  if (deck === null) return null;
  const { cards, stats, startedMode } = deck;

  return (
    <section className="screen">
      <h1>Готово</h1>
      <p className="done__info">
        {cardsCount(cards.length)}
      </p>
      <p className="done__stats">{`Знаю: ${stats.known} · Не знаю: ${stats.unknown}`}</p>

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
