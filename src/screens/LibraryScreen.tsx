import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import DeckRow from '@/components/DeckRow';
import { byRecent } from '@/core/library';
import {
  deckFileName,
  exportDeckTable,
  exportLibraryJson,
  libraryFileName,
  parseLibraryJson,
} from '@/core/transfer';
import { downloadText } from '@/lib/download';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function LibraryScreen() {
  const { decks } = useAppState();
  const dispatch = useAppDispatch();
  const [fileError, setFileError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = parseLibraryJson(String(reader.result ?? ''));
      if (!result.ok) {
        setFileError(result.error);
        return;
      }
      setFileError('');
      dispatch({ type: 'decks-imported', decks: result.decks });
    };
    // Молча оставлять пустой экран нельзя: со стороны это выглядит как ничего.
    reader.onerror = () => setFileError(`Не удалось прочитать файл «${file.name}»`);
    reader.readAsText(file);
  }

  return (
    <section className="screen">
      <h1>Мои колоды</h1>

      <div className="library">
        <div className="library__bar">
          <button type="button" className="btn" onClick={() => dispatch({ type: 'go-to-import' })}>
            Добавить колоду
          </button>
          {decks.length > 0 && (
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() =>
                downloadText(
                  libraryFileName(new Date()),
                  exportLibraryJson(decks),
                  'application/json',
                )
              }
            >
              Сохранить в файл
            </button>
          )}
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => fileInput.current?.click()}
          >
            Загрузить из файла
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleFile}
          />
        </div>

        {fileError !== '' && <p className="import__error">{fileError}</p>}

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
                  onExport={() =>
                    downloadText(deckFileName(deck), exportDeckTable(deck), 'text/tab-separated-values')
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
