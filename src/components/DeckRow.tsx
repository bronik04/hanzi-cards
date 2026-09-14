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
    const trimmed = draft.trim();
    const submit = () => {
      // Пустое имя не сохраняем: строка без имени неотличима от соседних.
      if (trimmed === '') return;
      onRename(trimmed);
      setMode('view');
    };
    const cancel = () => {
      setDraft(deck.name);
      setMode('view');
    };

    return (
      <div className="deck-row-wrap">
        <label className="library__rename-label">
          <span className="visually-hidden">Название колоды</span>
          <input
            className="library__rename"
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
              else if (event.key === 'Escape') cancel();
            }}
          />
        </label>
        <div className="deck-row__actions">
          <button type="button" className="btn" disabled={trimmed === ''} onClick={submit}>
            Сохранить
          </button>
          <button type="button" className="link-button" onClick={cancel}>
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
          <button type="button" className="btn" aria-label={`Удалить «${deck.name}»`} onClick={onDelete}>
            Удалить
          </button>
          <button
            type="button"
            className="link-button"
            aria-label={`отмена «${deck.name}»`}
            autoFocus
            onClick={() => setMode('view')}
          >
            отмена
          </button>
        </div>
      ) : (
        <div className="deck-row__actions">
          <button
            type="button"
            className="link-button"
            aria-label={`переименовать «${deck.name}»`}
            onClick={() => {
              setDraft(deck.name);
              setMode('rename');
            }}
          >
            переименовать
          </button>
          <button
            type="button"
            className="link-button"
            aria-label={`выгрузить «${deck.name}»`}
            onClick={onExport}
          >
            выгрузить
          </button>
          <button
            type="button"
            className="link-button"
            aria-label={`удалить «${deck.name}»`}
            onClick={() => setMode('confirm-delete')}
          >
            удалить
          </button>
        </div>
      )}
    </div>
  );
}
