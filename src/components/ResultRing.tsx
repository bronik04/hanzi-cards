import { useCountUp } from '@/hooks/useCountUp';

const RADIUS = 58;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DURATION_MS = 1400;

export default function ResultRing({ percent }: { percent: number }) {
  const shown = useCountUp(percent, DURATION_MS);

  return (
    <div className="result-ring" role="img" aria-label={`Верных ответов: ${percent}%`}>
      <svg width="136" height="136" viewBox="0 0 136 136" aria-hidden="true">
        {/* Поворот на -90°, чтобы заполнение начиналось сверху, а не справа. */}
        <g transform="rotate(-90 68 68)">
          <circle
            className="result-ring__track"
            cx="68"
            cy="68"
            r={RADIUS}
            fill="none"
            strokeWidth="12"
          />
          <circle
            className="result-ring__fill"
            cx="68"
            cy="68"
            r={RADIUS}
            fill="none"
            strokeWidth="12"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - shown / 100)}
          />
        </g>
      </svg>
      <b className="result-ring__value">{shown}%</b>
    </div>
  );
}
