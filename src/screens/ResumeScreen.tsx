import { useState } from 'react';
import { plural } from '@/core/plural';
import type { Session } from '@/core/session';
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
        {`${cards.length} ${plural(cards.length, ['карточка', 'карточки', 'карточек'])} · ${stageLabel(session)}`}
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

function stageLabel(session: Session): string {
  if (session.mode === 'ring') {
    return `Блок ${session.blockIndex + 1} из ${session.blocks.length}`;
  }
  return session.finalRound ? 'Сводный круг' : `Круг ${session.round}`;
}
