import type { SessionMode } from '@/core/session';

type ModeTileProps = {
  mode: SessionMode;
  name: string;
  hint: string;
  onStart: () => void;
};

export default function ModeTile({ mode, name, hint, onStart }: ModeTileProps) {
  return (
    <button
      type="button"
      className={`mode-tile mode-tile--${mode}`}
      aria-label={hint === '' ? name : `${name}. ${hint}`}
      onClick={onStart}
    >
      <span className="mode-tile__name">{name}</span>
      {hint !== '' && <span className="mode-tile__hint">{hint}</span>}
      {/* Схематичное превью: три полосы, намекающие на карточки. Декорация,
          поэтому скрыта от читалки — доступное имя уже всё сказало. */}
      <span className="mode-tile__preview" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}
