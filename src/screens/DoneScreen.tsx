import { cardsCount } from '@/core/plural';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function DoneScreen() {
  const { cards, stats, startedMode } = useAppState();
  const dispatch = useAppDispatch();

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
          onClick={() => dispatch({ type: 'go-to-mode' })}
        >
          В меню
        </button>
      </div>
    </section>
  );
}
