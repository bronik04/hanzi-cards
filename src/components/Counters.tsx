export default function Counters({ known, unknown }: { known: number; unknown: number }) {
  return (
    <div className="counters">
      <span className="counter counter--no" data-testid="count-unknown" aria-label="Не знаю">
        {/* Значок скрыт от читалки: aria-label уже говорит, какой это счётчик,
            и «крестик три» звучало бы загадкой. */}
        <span aria-hidden="true">✕</span> {unknown}
      </span>
      <span className="counter counter--yes" data-testid="count-known" aria-label="Знаю">
        <span aria-hidden="true">✓</span> {known}
      </span>
    </div>
  );
}
