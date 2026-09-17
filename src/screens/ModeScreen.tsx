import { DIRECTIONS, DIRECTION_LABELS, hasPinyin } from '@/core/deck';
import ModeTile from '@/components/ModeTile';
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
        <legend className="visually-hidden">Что спрашиваем</legend>
        {DIRECTIONS.map((value) => {
          const disabled = value === 'hanzi-to-pinyin' && !pinyinAvailable;
          return (
            <label key={value} className="chip">
              <input
                type="radio"
                name="direction"
                value={value}
                checked={direction === value}
                disabled={disabled}
                onChange={() => dispatch({ type: 'direction-changed', direction: value })}
              />
              <span>{DIRECTION_LABELS[value]}</span>
            </label>
          );
        })}
      </fieldset>
      {/* Вынесено за рамку: внутри подпись читалась как часть группы
          переключателей, снаружи она поясняет, почему один чип недоступен. */}
      {!pinyinAvailable && <p className="mode__hint">В колоде нет пиньиня</p>}

      <div className="mode__tiles">
        <ModeTile
          mode="simple"
          name="Просмотр"
          hint="Один круг, без повторов"
          onStart={() => dispatch({ type: 'session-started', mode: 'simple' })}
        />
        <ModeTile
          mode="ring"
          name="Кольца по 7"
          hint="Блоками, до полного круга"
          onStart={() => dispatch({ type: 'session-started', mode: 'ring' })}
        />
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
