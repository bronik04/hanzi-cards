import { cardsCount } from '@/core/plural';
import { stageLabel } from '@/core/session';
import { useActiveDeck, useAppDispatch } from '@/state/AppContext';

export default function ResumeScreen() {
  const deck = useActiveDeck();
  const dispatch = useAppDispatch();

  if (deck === null || deck.session === null) return null;
  const { cards, session } = deck;

  return (
    <section className="screen">
      <h1>Продолжить тренировку?</h1>
      <p className="resume__info">
        {`${cardsCount(cards.length)} · ${stageLabel(session)}`}
      </p>

      <div className="resume__buttons">
        <button type="button" className="btn" onClick={() => dispatch({ type: 'resume-confirmed' })}>
          Продолжить
        </button>
        {/* Подтверждения здесь нет: новая колода добавляется к библиотеке и
            сессию этой колоды не трогает — терять нечему. */}
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => dispatch({ type: 'go-to-import' })}
        >
          Загрузить новую
        </button>
      </div>

      <div className="mode__links">
        <button
          type="button"
          className="link-button"
          onClick={() => dispatch({ type: 'go-to-library' })}
        >
          В библиотеку
        </button>
      </div>
    </section>
  );
}
