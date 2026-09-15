import { DIRECTIONS, DIRECTION_LABELS, hasPinyin } from '@/core/deck';
import { cardsCount } from '@/core/plural';
import { useActiveDeck, useAppDispatch } from '@/state/AppContext';

export default function ModeScreen() {
  const deck = useActiveDeck();
  const dispatch = useAppDispatch();
  if (deck === null) return null;
  const { cards, direction } = deck;
  const pinyinAvailable = hasPinyin(cards);

  return (
    <section className="screen">
      <h1>
        {`Колода готова: ${cardsCount(cards.length)}`}
      </h1>

      <fieldset className="mode__directions">
        <legend>Что спрашиваем</legend>
        {DIRECTIONS.map((value) => {
          const disabled = value === 'hanzi-to-pinyin' && !pinyinAvailable;
          return (
            <label key={value}>
              <input
                type="radio"
                name="direction"
                value={value}
                checked={direction === value}
                disabled={disabled}
                onChange={() => dispatch({ type: 'direction-changed', direction: value })}
              />
              {DIRECTION_LABELS[value]}
            </label>
          );
        })}
        {!pinyinAvailable && <p className="mode__hint">В колоде нет пиньиня</p>}
      </fieldset>

      <div className="mode__buttons">
        <button
          type="button"
          className="btn"
          onClick={() => dispatch({ type: 'session-started', mode: 'simple' })}
        >
          Простой просмотр
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => dispatch({ type: 'session-started', mode: 'ring' })}
        >
          Заучивание кольцами по 7
        </button>
      </div>

      <div className="mode__links">
        <button type="button" className="link-button" onClick={() => dispatch({ type: 'go-to-library' })}>
          В библиотеку
        </button>
        <button type="button" className="link-button" onClick={() => dispatch({ type: 'go-to-import' })}>
          Загрузить новую таблицу
        </button>
      </div>
    </section>
  );
}
