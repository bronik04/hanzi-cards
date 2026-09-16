import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Screen } from '@/state/appReducer';

const DURATION_MS = 340;

/**
 * Переходы «вглубь». Перечислением, а не эвристикой по номеру экрана:
 * экранов шесть, порядок между ними не линейный, и угадывание здесь
 * читалось бы хуже, чем список.
 */
const FORWARD = new Set<string>([
  'library>import',
  'library>resume',
  'library>mode',
  'import>mode',
  'resume>training',
  'mode>training',
  'training>done',
]);

function direction(from: Screen, to: Screen): 'forward' | 'back' {
  return FORWARD.has(`${from}>${to}`) ? 'forward' : 'back';
}

type ScreenTransitionProps = { screen: Screen; children: ReactNode };

export default function ScreenTransition({ screen, children }: ScreenTransitionProps) {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState<ReactNode | null>(null);
  const [way, setWay] = useState<'forward' | 'back'>('forward');
  const previous = useRef<{ screen: Screen; node: ReactNode }>({ screen, node: children });
  const pane = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const was = previous.current;
    previous.current = { screen, node: children };
    if (was.screen === screen) return undefined;

    setWay(direction(was.screen, screen));

    if (reduced) return undefined;

    setLeaving(was.node);
    const timer = window.setTimeout(() => setLeaving(null), DURATION_MS);
    return () => window.clearTimeout(timer);
    // children намеренно не в зависимостях: перерисовка того же экрана
    // не должна запускать переход.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, reduced]);

  // Фокус переводится на заголовок нового экрана. Без этого он остаётся на
  // кнопке, которой на новом экране уже нет.
  useEffect(() => {
    const root = pane.current;
    if (root === null) return;
    const target = root.querySelector('h1') ?? root.querySelector('.screen');
    if (!(target instanceof HTMLElement)) return;
    // tabIndex -1 — чтобы заголовок можно было сфокусировать программно,
    // не вставляя его в обход по Tab.
    target.tabIndex = -1;
    target.focus();
  }, [screen]);

  return (
    <div className={`transition transition--${way}`}>
      {leaving !== null && (
        <div className="transition__pane transition__pane--leaving" inert aria-hidden="true">
          {leaving}
        </div>
      )}
      <div ref={pane} key={screen} className="transition__pane transition__pane--entering">
        {children}
      </div>
    </div>
  );
}
