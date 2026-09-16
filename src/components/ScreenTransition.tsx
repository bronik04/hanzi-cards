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

/**
 * Разметка уходящего экрана без того, что обязано быть уникальным в документе.
 * Снимок — декоративная картинка: `id` ломал бы ссылки вроде `aria-labelledby`,
 * одинаковый `name` склеил бы радиогруппу снимка с живой, а `data-testid`
 * начал бы находиться дважды из тестов.
 */
function toSnapshot(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;
  for (const element of clone.querySelectorAll('[id], [name], [data-testid]')) {
    element.removeAttribute('id');
    element.removeAttribute('name');
    element.removeAttribute('data-testid');
  }
  return clone.innerHTML;
}

type ScreenTransitionProps = { screen: Screen; children: ReactNode };

export default function ScreenTransition({ screen, children }: ScreenTransitionProps) {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState<string | null>(null);
  const [way, setWay] = useState<'forward' | 'back'>('forward');
  const previousScreen = useRef<Screen>(screen);
  /** Разметка предыдущего кадра — снимок, из которого рисуется уходящий экран. */
  const snapshot = useRef('');
  const pane = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const was = previousScreen.current;
    previousScreen.current = screen;
    if (was === screen) return undefined;

    setWay(direction(was, screen));

    if (reduced) {
      setLeaving(null);
      return undefined;
    }

    setLeaving(snapshot.current);
    const timer = window.setTimeout(() => setLeaving(null), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [screen, reduced]);

  // Идёт после эффекта выше и без зависимостей: на кадре смены экрана тот
  // успевает прочитать снимок предыдущего, и только потом снимок обновляется.
  useEffect(() => {
    snapshot.current = pane.current === null ? '' : toSnapshot(pane.current);
  });

  // Фокус переводится на заголовок нового экрана. Без этого он остаётся на
  // кнопке, которой на новом экране уже нет.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
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
      {!reduced && leaving !== null && (
        /*
         * Уходящий экран рисуется снимком разметки, а не тем же элементом.
         * Живой элемент React смонтировал бы заново и прочитал бы текущее
         * состояние: после последнего свайпа экран тренировки показал бы
         * «Тренировка прервана», а его экземпляр повесил бы на window два
         * живых обработчика клавиш, через которые стрелка уходила бы свайпом
         * в уже законченную сессию. Разметка своя, React её уже экранировал,
         * так что обратная вставка безопасна.
         */
        <div
          className="transition__pane transition__pane--leaving"
          inert
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: leaving }}
        />
      )}
      <div ref={pane} key={screen} className="transition__pane transition__pane--entering">
        {children}
      </div>
    </div>
  );
}
