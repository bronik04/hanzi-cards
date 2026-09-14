import { byRecent } from '@/core/library';
import { cardsCount } from '@/core/plural';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function LibraryScreen() {
  const { decks } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <section className="screen">
      <h1>Мои колоды</h1>

      <div className="library">
        <div className="library__bar">
          <button type="button" className="btn" onClick={() => dispatch({ type: 'go-to-import' })}>
            Добавить колоду
          </button>
        </div>

        {decks.length === 0 ? (
          <p className="library__empty">
            Пока ни одной колоды. Добавьте первую — вставьте таблицу со словами.
          </p>
        ) : (
          <ul className="library__list">
            {byRecent(decks).map((deck) => (
              <li key={deck.id}>
                <button
                  type="button"
                  className="deck-row"
                  onClick={() => dispatch({ type: 'deck-opened', id: deck.id, now: new Date() })}
                >
                  <span className="deck-row__main">
                    <span className="deck-row__name">{deck.name}</span>
                    <span className="deck-row__meta">
                      {cardsCount(deck.cards.length)}
                      {deck.session !== null && !deck.session.finished && (
                        <span className="deck-row__unfinished"> · тренировка не закончена</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
