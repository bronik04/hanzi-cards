import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { assignIds } from '@/core/deck';
import { suggestedName } from '@/core/library';
import { cardsCount, plural } from '@/core/plural';
import { parseTable } from '@/core/parse';
import type { ColumnMode } from '@/core/parse';
import { useAppDispatch, useAppState } from '@/state/AppContext';

const PREVIEW_LIMIT = 5;

const COLUMN_OPTIONS: ReadonlyArray<{ value: ColumnMode; label: string }> = [
  { value: 'auto', label: 'Определить автоматически' },
  { value: 'three', label: 'Иероглиф + пиньинь + перевод' },
  { value: 'two', label: 'Иероглиф + перевод' },
];

export default function ImportScreen() {
  const { decks } = useAppState();
  const dispatch = useAppDispatch();
  const [text, setText] = useState('');
  const [columnMode, setColumnMode] = useState<ColumnMode>('auto');
  const [fileError, setFileError] = useState('');
  const [name, setName] = useState(() => suggestedName(new Date()));
  const [nameTouched, setNameTouched] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const result = useMemo(() => parseTable(text, columnMode), [text, columnMode]);
  const preview = result.cards.slice(0, PREVIEW_LIMIT);
  const hidden = result.cards.length - preview.length;

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFileError('');
      setText(String(reader.result ?? ''));
      // Имя файла подсказывает имя колоды, но только пока пользователь не ввёл своё.
      if (!nameTouched) setName(file.name.replace(/\.[^.]+$/, ''));
    };
    // Молча очищать поле нельзя: со стороны это выглядит так, будто
    // приложение съело уже набранную таблицу.
    reader.onerror = () => setFileError(`Не удалось прочитать файл «${file.name}»`);
    reader.readAsText(file);
    event.target.value = '';
  }

  return (
    <section className="screen">
      <h1>Новая колода</h1>

      <label className="import__name">
        <span>Название колоды</span>
        <input
          value={name}
          onChange={(event) => {
            setNameTouched(true);
            setName(event.target.value);
          }}
        />
      </label>

      <textarea
        className="import__textarea"
        aria-label="Таблица со словами"
        placeholder={'你好\tni3 hao3\tпривет'}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      <div>
        <button type="button" className="link-button" onClick={() => fileInput.current?.click()}>
          Или загрузить файл (.csv, .tsv, .txt)
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          aria-label="Файл с таблицей"
          hidden
          onChange={handleFile}
        />
      </div>

      {fileError !== '' && <p className="import__error">{fileError}</p>}

      <fieldset className="import__columns">
        <legend>Колонки таблицы</legend>
        {COLUMN_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name="columns"
              value={option.value}
              checked={columnMode === option.value}
              onChange={() => setColumnMode(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      {preview.length > 0 && (
        <table className="import__preview">
          <thead>
            <tr>
              <th scope="col">Иероглиф</th>
              <th scope="col">Пиньинь</th>
              <th scope="col">Перевод</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((card, index) => (
              <tr key={`${index}-${card.hanzi}`} data-testid="preview-row">
                <td>{card.hanzi}</td>
                <td>{card.pinyin}</td>
                <td>{card.translation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {hidden > 0 && <p className="import__more">{`…и ещё ${hidden}`}</p>}

      <p className="import__message">{describe(result.addedCount, result.skippedCount)}</p>

      <button
        type="button"
        className="btn"
        disabled={result.addedCount === 0}
        onClick={() =>
          dispatch({
            type: 'deck-created',
            name: name.trim() === '' ? suggestedName(new Date()) : name.trim(),
            cards: assignIds(result.cards),
            now: new Date(),
          })
        }
      >
        Создать колоду
      </button>

      {decks.length > 0 && (
        <button
          type="button"
          className="link-button"
          onClick={() => dispatch({ type: 'import-cancelled' })}
        >
          Отменить
        </button>
      )}
    </section>
  );
}

function describe(added: number, skipped: number): string {
  if (added === 0 && skipped === 0) return '';
  const addedText = `Добавлено ${cardsCount(added)}`;
  if (skipped === 0) return addedText;
  const skippedVerb = plural(skipped, ['пропущена', 'пропущено', 'пропущено']);
  const skippedNoun = plural(skipped, ['строка', 'строки', 'строк']);
  return `${addedText}, ${skippedVerb} ${skipped} ${skippedNoun}`;
}
