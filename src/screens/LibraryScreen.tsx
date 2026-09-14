import DeckRow from '@/components/DeckRow';
import { byRecent } from '@/core/library';
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
                <DeckRow
                  deck={deck}
                  onOpen={() => dispatch({ type: 'deck-opened', id: deck.id, now: new Date() })}
                  onRename={(name) => dispatch({ type: 'deck-renamed', id: deck.id, name })}
                  onDelete={() => dispatch({ type: 'deck-deleted', id: deck.id })}
                  onExport={() => undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
