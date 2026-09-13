export default function Counters({ known, unknown }: { known: number; unknown: number }) {
  return (
    <div className="counters">
      <span className="counter counter--no" data-testid="count-unknown" aria-label="Не знаю">
        {unknown}
      </span>
      <span className="counter counter--yes" data-testid="count-known" aria-label="Знаю">
        {known}
      </span>
    </div>
  );
}
