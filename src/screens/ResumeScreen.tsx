import { useState } from 'react';
import { cardsCount } from '@/core/plural';
import { stageLabel } from '@/core/session';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function ResumeScreen() {
  const { cards, session } = useAppState();
  const dispatch = useAppDispatch();
  const [confirming, setConfirming] = useState(false);

  if (session === null) return null;

  return (
    <section className="screen">
      <h1>Продолжить тренировку?</h1>
      <p className="resume__info">
        {`${cardsCount(cards.length)} · ${stageLabel(session)}`}
      </p>

      {confirming ? (
        <>
          <p className="resume__warning">Прогресс текущей тренировки будет потерян.</p>
          <div className="resume__buttons">
            <button type="button" className="btn" onClick={() => dispatch({ type: 'go-to-import' })}>
              Да, загрузить новую
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setConfirming(false)}>
              Отмена
            </button>
          </div>
        </>
      ) : (
        <div className="resume__buttons">
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: 'resume-confirmed' })}
          >
            Продолжить
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => setConfirming(true)}>
            Загрузить новую
          </button>
        </div>
      )}
    </section>
  );
}
