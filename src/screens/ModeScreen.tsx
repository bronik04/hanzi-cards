import { DIRECTIONS, DIRECTION_LABELS, hasPinyin } from '@/core/deck';
import { plural } from '@/core/plural';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function ModeScreen() {
  const { cards, direction } = useAppState();
  const dispatch = useAppDispatch();
  const pinyinAvailable = hasPinyin(cards);

  return (
    <section className="screen">
      <h1>
        {`Колода готова: ${cards.length} ${plural(cards.length, ['карточка', 'карточки', 'карточек'])}`}
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

      <button type="button" className="link-button" onClick={() => dispatch({ type: 'go-to-import' })}>
        Загрузить новую таблицу
      </button>
    </section>
  );
}
