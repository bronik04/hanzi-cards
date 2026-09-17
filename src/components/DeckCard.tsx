import { useState } from 'react';
import DeckMenu from '@/components/DeckMenu';
import type { MenuItem } from '@/components/DeckMenu';
import type { Deck } from '@/core/library';
import { cardsCount } from '@/core/plural';

type DeckCardProps = {
  deck: Deck;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onExport: () => void;
};

type Mode = 'view' | 'rename' | 'confirm-delete';

const ITEMS: readonly MenuItem[] = [
  { id: 'rename', label: 'Переименовать' },
  { id: 'export', label: 'Выгрузить таблицей' },
  { id: 'delete', label: 'Удалить', danger: true },
];

export default function DeckCard({ deck, onOpen, onRename, onDelete, onExport }: DeckCardProps) {
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState(deck.name);
  const unfinished = deck.session !== null && !deck.session.finished;

  if (mode === 'rename') {
    const trimmed = draft.trim();
    const submit = () => {
      // Пустое имя не сохраняем: карточка без имени неотличима от соседних.
      if (trimmed === '') return;
      onRename(trimmed);
      setMode('view');
    };
    const cancel = () => {
      setDraft(deck.name);
      setMode('view');
    };

    return (
      <div className="deck-card deck-card--editing">
        <label className="deck-card__rename-label">
          <span className="visually-hidden">Название колоды</span>
          <input
            className="deck-card__rename"
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
              else if (event.key === 'Escape') cancel();
            }}
          />
        </label>
        <div className="deck-card__buttons">
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

  if (mode === 'confirm-delete') {
    return (
      <div className="deck-card deck-card--editing">
        <p className="deck-card__confirm">Удалить вместе с прогрессом?</p>
        <div className="deck-card__buttons">
          <button
            type="button"
            className="btn btn--danger"
            aria-label={`Удалить «${deck.name}»`}
            onClick={onDelete}
          >
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
      </div>
    );
  }

  return (
    <div className="deck-card">
      <button type="button" className="deck-card__open" onClick={onOpen}>
        <span className="deck-card__name">{deck.name}</span>
        <span className="deck-card__count">{cardsCount(deck.cards.length)}</span>
        {unfinished && <span className="deck-card__unfinished">тренировка не закончена</span>}
      </button>

      <div className="deck-card__menu">
        <DeckMenu
          label={`Действия с колодой «${deck.name}»`}
          items={ITEMS}
          onSelect={(id) => {
            if (id === 'rename') {
              setDraft(deck.name);
              setMode('rename');
            } else if (id === 'delete') {
              setMode('confirm-delete');
            } else {
              onExport();
            }
          }}
        />
      </div>
    </div>
  );
}
