import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function query(): MediaQueryList | null {
  // matchMedia нет в серверном рендере и в части тестовых окружений.
  // Его отсутствие означает «нечего спросить», то есть движение разрешено.
  return typeof matchMedia === 'function' ? matchMedia(QUERY) : null;
}

/** true, когда пользователь просил убрать движение в настройках системы. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => query()?.matches ?? false);

  useEffect(() => {
    const mql = query();
    if (mql === null) return;

    function update(event: MediaQueryListEvent) {
      setReduced(event.matches);
    }
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return reduced;
}
