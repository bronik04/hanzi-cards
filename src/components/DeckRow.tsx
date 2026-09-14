import { useState } from 'react';
import type { Deck } from '@/core/library';
import { cardsCount } from '@/core/plural';

type DeckRowProps = {
  deck: Deck;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onExport: () => void;
};

type Mode = 'view' | 'rename' | 'confirm-delete';

export default function DeckRow({ deck, onOpen, onRename, onDelete, onExport }: DeckRowProps) {
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState(deck.name);
  const unfinished = deck.session !== null && !deck.session.finished;

  if (mode === 'rename') {
    return (
      <div className="deck-row-wrap">
        <label className="library__rename-label">
          <span className="visually-hidden">Название колоды</span>
          <input
            className="library__rename"
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <div className="deck-row__actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              // Пустое имя не сохраняем: строка без имени неотличима от соседних.
              if (draft.trim() === '') return;
              onRename(draft.trim());
              setMode('view');
            }}
          >
            Сохранить
          </button>
          <button type="button" className="link-button" onClick={() => setMode('view')}>
            отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-row-wrap">
      <button type="button" className="deck-row" onClick={onOpen}>
        <span className="deck-row__main">
          <span className="deck-row__name">{deck.name}</span>
          <span className="deck-row__meta">
            {cardsCount(deck.cards.length)}
            {unfinished && (
              <span className="deck-row__unfinished"> · тренировка не закончена</span>
            )}
          </span>
        </span>
      </button>

      {mode === 'confirm-delete' ? (
        <div className="deck-row__confirm">
          <p>Удалить вместе с прогрессом?</p>
          <button type="button" className="btn" onClick={onDelete}>
            Удалить
          </button>
          <button type="button" className="link-button" onClick={() => setMode('view')}>
            отмена
          </button>
        </div>
      ) : (
        <div className="deck-row__actions">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setDraft(deck.name);
              setMode('rename');
            }}
          >
            переименовать
          </button>
          <button type="button" className="link-button" onClick={onExport}>
            выгрузить
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => setMode('confirm-delete')}
          >
            удалить
          </button>
        </div>
      )}
    </div>
  );
}
