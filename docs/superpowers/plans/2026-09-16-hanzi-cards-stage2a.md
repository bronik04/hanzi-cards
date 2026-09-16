# Карточки 汉字, Этап 2a — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать пяти существующим экранам связный язык — шкалы, состояния, движение, переходы — не добавляя ни одной новой возможности.

**Architecture:** Шкалы переезжают в `tokens.css`, а `app.css` (544 строки) разделяется по ответственности на четыре файла. Появляются два новых модуля: меню действий над колодой и хук чтения `prefers-reduced-motion`. Существующие компоненты (`Card`, `Counters`, `SimpleProgress`, `RingProgress`, `useSwipeGesture`) переиспользуются: у них меняется оформление, а у `Card` — расчёт непрозрачности подкраски.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + React Testing Library, Playwright. Новых зависимостей не добавляется.

**Спецификация:** [docs/superpowers/specs/2026-09-16-hanzi-cards-stage2a-design.md](../specs/2026-09-16-hanzi-cards-stage2a-design.md)

## Global Constraints

- Node.js версии из `.nvmrc` (24) или новее.
- Весь интерфейс на русском. Идентификаторы, имена файлов и сообщения коммитов — на английском. Комментарии в коде — на русском.
- `src/core/**` не импортирует React и не обращается к `window` и `document`. **На этом этапе `src/core` не меняется вовсе.**
- Палитра Этапа 0 не меняется: `--bg: #0a092d`, `--surface: #2e3856`, `--surface-raised: #3a4a6b`, `--text: #f6f7fb`, `--text-muted: #a0a8c0`, `--accent: #4255ff`, `--yes: #3ccf91`, `--no: #ff5a5f`.
- Цвета режимов: `--mode-simple: var(--accent)`, `--mode-ring: #f0b429`, текст на жёлтом — `#26210a`.
- Кольцо фокуса — `0 0 0 3px #4255ff80`, применяется через `:focus-visible`.
- Порог свайпа — `SWIPE_THRESHOLD = 80` в `src/hooks/useSwipeGesture.ts`. Размер блока колец — `BLOCK_SIZE = 7`.
- Длительность перехода между экранами — 340 мс, кривая `cubic-bezier(.3, .7, .3, 1)`. Набегание чисел на итогах — 1400 мс.
- Точки перелома: `40rem` и `55rem`.
- `prefers-reduced-motion: reduce` отключает перемещения, масштабирования и переходы; подкраска, цвет счётчиков и состояния кнопок остаются.
- **Правка теста не должна ослаблять проверку.** Меняя селектор, ответьте, что тест доказывал раньше и доказывает ли он это теперь. На Этапе 1 замена тестового файла целиком дважды молча выкинула покрытие.
- Каждая задача заканчивается коммитом в стиле Conventional Commits.
- Сообщения коммитов заканчиваются строкой `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Работа идёт в отдельной ветке. Перед слиянием в `master` проводится код-ревью — это правило пользователя.

## File Structure

| Файл | Ответственность |
|------|-----------------|
| `src/styles/tokens.css` | Палитра и шкалы: скругления, тени, отступы, веса, кольцо фокуса, цвета режимов |
| `src/styles/base.css` | Сброс, `body`, типографика, `:focus-visible`, общий блок `prefers-reduced-motion` |
| `src/styles/components.css` | Кнопки, ссылки-кнопки, таблетки, карточка тренировки, прогресс, меню, карточка колоды, плитка режима |
| `src/styles/screens.css` | То, что относится к конкретным экранам: библиотека, импорт, режим, тренировка, итоги, возобновление |
| `src/components/DeckMenu.tsx` | Меню действий над колодой: клавиатура, фокус, закрытие |
| `src/components/DeckCard.tsx` | Карточка колоды в сетке — заменяет `DeckRow.tsx` |
| `src/components/ModeTile.tsx` | Плитка режима на экране выбора |
| `src/components/ResultRing.tsx` | Кольцо с процентом на экране итогов |
| `src/hooks/useReducedMotion.ts` | Чтение `prefers-reduced-motion` с подпиской на изменение |
| `src/hooks/useCountUp.ts` | Набегание числа от нуля до цели за заданное время |
| `src/components/ScreenTransition.tsx` | Направленный переход между экранами и перевод фокуса на заголовок |
| `src/components/Card.tsx` | Непрерывная подкраска вместо ступеньки, штамп |
| `src/screens/*.tsx` | Разметка под новые компоненты |

Тесты лежат рядом с модулем. Сквозные — в существующих `e2e/` и `e2e-subpath/`.

**Что удаляется:** `src/components/DeckRow.tsx` и `src/components/DeckRow.test.tsx` (заменяются на `DeckCard`), `src/styles/app.css` (разделяется).

---

### Task 1: Шкалы токенов, разделение CSS и кольцо фокуса

Фундамент этапа. Ничего не должно измениться на вид, кроме одного: у интерактивных элементов появляется видимое кольцо фокуса. Сейчас правил `:focus` в проекте ноль.

**Files:**
- Modify: `src/styles/tokens.css`, `src/main.tsx`
- Create: `src/styles/base.css`, `src/styles/components.css`, `src/styles/screens.css`
- Delete: `src/styles/app.css`
- Test: `e2e/focus.spec.ts` (create)

**Interfaces:**
- Produces: CSS-переменные `--radius-sm|md|lg|pill`, `--shadow-sm|md|lg`, `--space-1`…`--space-6`, `--weight-regular|semibold|bold|heavy`, `--focus-ring`, `--mode-simple`, `--mode-ring`, `--mode-ring-text`. Все последующие задачи берут значения отсюда и не пишут литералов.

- [ ] **Step 1: Дописать шкалы в `tokens.css`**

Откройте `src/styles/tokens.css`. Внутри блока `:root`, сразу после строки `--no: #ff5a5f;`, замените две строки

```css
  --radius: 16px;
  --gap: 1rem;
```

на

```css
  /* Цвета режимов тренировки. На Этапе 2b их станет шесть, поэтому они
     заведены шкалой, а не по месту. */
  --mode-simple: var(--accent);
  --mode-ring: #f0b429;
  /* Белый по жёлтому не проходит по контрасту. */
  --mode-ring-text: #26210a;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  /* Старое имя оставлено синонимом: на него ссылается разметка, которую эта
     задача не трогает. Уходит вместе с последним использованием в задаче 9. */
  --radius: var(--radius-lg);

  --shadow-sm: 0 4px 14px rgb(0 0 0 / 0.25);
  --shadow-md: 0 8px 22px rgb(0 0 0 / 0.35);
  --shadow-lg: 0 12px 32px rgb(0 0 0 / 0.45);

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --gap: var(--space-4);

  --weight-regular: 400;
  --weight-semibold: 600;
  --weight-bold: 700;
  --weight-heavy: 800;

  /* Без этого приложение проходится с клавиатуры вслепую: правил :focus в
     проекте до Этапа 2a не было ни одного. */
  --focus-ring: 0 0 0 3px #4255ff80;
```

- [ ] **Step 2: Вынести сброс и типографику в `base.css`**

В конце `src/styles/tokens.css` сейчас лежат правила `*` и `body`. Удалите оттуда весь блок

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
}
```

Создайте `src/styles/base.css`:

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
}

h1 {
  font-size: clamp(1.4rem, 4vh, 2.2rem);
  font-weight: var(--weight-bold);
  margin: 0;
  text-align: center;
}

/* :focus-visible, а не :focus — иначе кольцо вспыхивает при клике мышью,
   и это читается как ошибка отрисовки. */
button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
[tabindex]:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* Общее правило этапа. Точечные исключения — там, где движение несёт
   информацию, а не украшает: подкраска свайпа и цвет счётчиков остаются. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Разделить `app.css` на два файла**

`src/styles/app.css` содержит 544 строки. Разделите его механически, ничего не переписывая по содержанию.

В `src/styles/components.css` перенесите правила, не привязанные к экрану: `.screen`, `.btn`, `.btn:disabled`, `.btn--quiet`, `.link-button`, `.link-button:disabled`, `.card`, `.card--dragging`, `.card--exiting`, `.card--yes`, `.card--no`, `.card__body`, `.card__main`, `.card__main--hanzi`, `.card__secondary`, `.card__tertiary`, `.icon-btn`, `.progress`, `.progress__fill`, `.segments`, `.segment`, `.segment--done`, `.segment--active`, `.counters`, `.counter`, `.counter--yes`, `.counter--no`, `.warning`, `.update-prompt`, и всё, что относится к `.deck-row*`.

В `src/styles/screens.css` перенесите остальное: всё с префиксами `.import__`, `.mode__`, `.training__`, `.resume__`, `.done__`, `.library*`, а также `.screen--training`.

Блок

```css
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
```

не переносите никуда: его заменяет общее правило из `base.css`.

Удалите `src/styles/app.css`.

- [ ] **Step 4: Переключить импорты**

В `src/main.tsx` замените

```ts
import '@/styles/tokens.css';
import '@/styles/app.css';
```

на

```ts
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';
import '@/styles/screens.css';
```

Порядок важен: `tokens` объявляет переменные, `base` задаёт сброс, `components` и `screens` их используют.

- [ ] **Step 5: Убедиться, что ничего не сломалось**

```bash
npm run test && npm run lint && npm run typecheck && npm run build
```

Ожидается: 295 тестов зелёные, линтер и типы чисто, сборка проходит. Ни один тест не должен быть исправлен на этом шаге — если что-то покраснело, перенос правил сделан неточно.

- [ ] **Step 6: Написать сквозной тест на кольцо фокуса**

jsdom не считает каскад, поэтому кольцо фокуса проверяется в настоящем браузере. Создайте `e2e/focus.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('кнопки получают видимое кольцо фокуса с клавиатуры', async ({ page }) => {
  await page.goto('/');

  const addDeck = page.getByRole('button', { name: 'Добавить колоду' });
  await addDeck.focus();

  const shadow = await addDeck.evaluate((el) => getComputedStyle(el).boxShadow);
  // Кольцо задано через box-shadow, а не outline: outline не скругляется
  // по border-radius в части браузеров.
  expect(shadow).not.toBe('none');
  expect(shadow).toContain('rgba(66, 85, 255');
});

test('клик мышью кольцо не зажигает', async ({ page }) => {
  await page.goto('/');

  const addDeck = page.getByRole('button', { name: 'Добавить колоду' });
  await addDeck.click();
  // После клика приложение уходит на экран импорта; возвращаемся и смотрим
  // на кнопку, по которой только что кликнули, а не на новую.
  await page.getByRole('button', { name: 'В библиотеку' }).click();

  const shadow = await page
    .getByRole('button', { name: 'Добавить колоду' })
    .evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toBe('none');
});
```

- [ ] **Step 7: Прогнать сквозные тесты**

```bash
npm run test:e2e
```

Ожидается: 11 тестов зелёные (9 прежних плюс 2 новых). Если порт 4173 занят устаревшим `vite preview`, снимите его перед запуском: `lsof -ti:4173 | xargs kill`.

- [ ] **Step 8: Коммит**

```bash
git add src/styles/ src/main.tsx e2e/focus.spec.ts
git commit -m "feat: add token scales, split the stylesheet and show focus rings

The stylesheet had grown to 544 lines with radius and shadow values written
in place, and no :focus rule at all — the app was untraversable by keyboard.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Хук `useReducedMotion`

Отдельная задача, потому что от него зависят три следующие. Проверка по месту расползлась бы по пяти экранам.

**Files:**
- Create: `src/hooks/useReducedMotion.ts`, `src/hooks/useReducedMotion.test.tsx`

**Interfaces:**
- Produces: `useReducedMotion(): boolean` — `true`, когда пользователь просил убрать движение.

- [ ] **Step 1: Написать падающие тесты**

Создайте `src/hooks/useReducedMotion.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Listener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(initial: boolean) {
  let listener: Listener | null = null;
  const mql = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, fn: Listener) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = null;
    },
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mql));
  return {
    change(matches: boolean) {
      mql.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
    get subscribed() {
      return listener !== null;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReducedMotion', () => {
  it('читает текущее значение при первом рендере', () => {
    mockMatchMedia(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });

  it('возвращает false, когда движение разрешено', () => {
    mockMatchMedia(false);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });

  // Настройку меняют на ходу — в macOS это переключатель в системных
  // настройках, и вкладка перезагружаться не обязана.
  it('следит за изменением настройки', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());

    act(() => media.change(true));
    expect(result.current).toBe(true);
  });

  it('отписывается при размонтировании', () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => useReducedMotion());
    expect(media.subscribed).toBe(true);

    unmount();
    expect(media.subscribed).toBe(false);
  });

  // Тесты и серверный рендер живут без matchMedia. Падать здесь нельзя:
  // отсутствие ответа означает «движение разрешено», а не поломку.
  it('без matchMedia считает, что движение разрешено', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/hooks/useReducedMotion.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/hooks/useReducedMotion"».

- [ ] **Step 3: Реализовать хук**

Создайте `src/hooks/useReducedMotion.ts`:

```ts
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
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
npm run test -- src/hooks/useReducedMotion.test.tsx
```

Ожидается: 5 тестов зелёные.

- [ ] **Step 5: Коммит**

```bash
git add src/hooks/useReducedMotion.ts src/hooks/useReducedMotion.test.tsx
git commit -m "feat: read prefers-reduced-motion as a hook

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Меню действий над колодой

Единственный новый компонент этапа. Он заменяет три всегда видимые кнопки в строке колоды, поэтому обязан уметь всё, что умели они, — включая работу с клавиатуры. На Этапе 1 мы уже ловили ровно этот класс ошибок: подтверждение удаления открывалось, не забрав фокус, и человек с клавиатурой не узнавал, что оно появилось.

Компонент пишется отдельно от библиотеки и проверяется отдельно: так его поведение видно без декораций вокруг.

**Files:**
- Create: `src/components/DeckMenu.tsx`, `src/components/DeckMenu.test.tsx`
- Modify: `src/styles/components.css`

**Interfaces:**
- Produces:
  - `type MenuItem = { id: string; label: string; danger?: boolean }`
  - `type DeckMenuProps = { label: string; items: readonly MenuItem[]; onSelect: (id: string) => void }`
  - `export default function DeckMenu(props: DeckMenuProps)`

- [ ] **Step 1: Написать падающие тесты**

Создайте `src/components/DeckMenu.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeckMenu from '@/components/DeckMenu';

const ITEMS = [
  { id: 'rename', label: 'Переименовать' },
  { id: 'export', label: 'Выгрузить таблицей' },
  { id: 'delete', label: 'Удалить', danger: true },
];

function setup(onSelect = vi.fn()) {
  const user = userEvent.setup();
  render(<DeckMenu label="Действия с колодой «Юнит 1»" items={ITEMS} onSelect={onSelect} />);
  return { user, onSelect, button: screen.getByRole('button', { name: /Действия с колодой/ }) };
}

describe('DeckMenu', () => {
  it('до открытия пунктов нет', () => {
    setup();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('кнопка объявляет, что за ней меню и закрыто ли оно', async () => {
    const { user, button } = setup();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('открывается кликом и показывает все пункты', async () => {
    const { user, button } = setup();
    await user.click(button);

    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Переименовать',
      'Выгрузить таблицей',
      'Удалить',
    ]);
  });

  // Без этого человек с клавиатурой не узнаёт, что меню открылось.
  it('при открытии фокус уходит на первый пункт', async () => {
    const { user, button } = setup();
    await user.click(button);
    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).toHaveFocus();
  });

  it('открывается с клавиатуры', async () => {
    const { user, button } = setup();
    button.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).toHaveFocus();
  });

  it('стрелка вниз ведёт по пунктам и заворачивает на первый', async () => {
    const { user, button } = setup();
    await user.click(button);

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Выгрузить таблицей' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).toHaveFocus();
  });

  it('стрелка вверх с первого пункта заворачивает на последний', async () => {
    const { user, button } = setup();
    await user.click(button);

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toHaveFocus();
  });

  it('выбор пункта сообщает его идентификатор и закрывает меню', async () => {
    const { user, button, onSelect } = setup();
    await user.click(button);
    await user.click(screen.getByRole('menuitem', { name: 'Выгрузить таблицей' }));

    expect(onSelect).toHaveBeenCalledWith('export');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('Escape закрывает меню и возвращает фокус на кнопку', async () => {
    const { user, button } = setup();
    await user.click(button);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  // Фокус обязан вернуться и здесь: иначе после выбора пункта он падает на
  // body, и следующий Tab начинает обход страницы заново.
  it('после выбора пункта фокус возвращается на кнопку', async () => {
    const { user, button } = setup();
    await user.click(button);
    await user.click(screen.getByRole('menuitem', { name: 'Переименовать' }));

    expect(button).toHaveFocus();
  });

  it('клик мимо закрывает меню и ничего не выбирает', async () => {
    const { user, button, onSelect } = setup();
    await user.click(button);
    await user.click(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('опасный пункт помечен для стилей', async () => {
    const { user, button } = setup();
    await user.click(button);

    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toHaveClass('menu__item--danger');
    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).not.toHaveClass(
      'menu__item--danger',
    );
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/components/DeckMenu.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/components/DeckMenu"».

- [ ] **Step 3: Реализовать компонент**

Создайте `src/components/DeckMenu.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export type MenuItem = { id: string; label: string; danger?: boolean };

type DeckMenuProps = {
  /** Доступное имя кнопки. Включает название колоды: иначе читалка
   *  произносит «Действия» подряд столько раз, сколько колод в библиотеке. */
  label: string;
  items: readonly MenuItem[];
  onSelect: (id: string) => void;
};

export default function DeckMenu({ label, items, onSelect }: DeckMenuProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  // Фокус уходит внутрь сразу после открытия: без этого клавиатурный
  // пользователь не узнаёт, что меню появилось.
  useEffect(() => {
    if (!open) return;
    focusItem(0);
  }, [open]);

  // Закрытие по клику мимо. Слушаем pointerdown, а не click: click приходит
  // после того, как элемент под курсором уже отработал своё нажатие.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (list.current?.contains(target) === true) return;
      if (button.current?.contains(target) === true) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function focusItem(index: number) {
    const nodes = list.current?.querySelectorAll('[role="menuitem"]');
    if (nodes === undefined) return;
    const node = nodes[(index + nodes.length) % nodes.length];
    if (node instanceof HTMLElement) node.focus();
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const nodes = Array.from(list.current?.querySelectorAll('[role="menuitem"]') ?? []);
    const current = nodes.indexOf(document.activeElement as Element);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  }

  return (
    <div className="menu">
      <button
        ref={button}
        type="button"
        className="menu__button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        ⋯
      </button>

      {open && (
        <ul ref={list} className="menu__list" role="menu" aria-label={label} onKeyDown={onListKeyDown}>
          {items.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={item.danger === true ? 'menu__item menu__item--danger' : 'menu__item'}
                onClick={() => {
                  onSelect(item.id);
                  close(true);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
npm run test -- src/components/DeckMenu.test.tsx
```

Ожидается: 12 тестов зелёные, предупреждений React в выводе нет.

- [ ] **Step 5: Добавить стили меню**

Допишите в конец `src/styles/components.css`:

```css
.menu {
  position: relative;
  flex: none;
}

.menu__button {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: 1.1rem;
  line-height: 1;
  letter-spacing: 0.06em;
  cursor: pointer;
}

.menu__button:hover {
  background: var(--surface-raised);
  color: var(--text);
}

.menu__list {
  position: absolute;
  top: 2.2rem;
  right: 0;
  z-index: 2;
  min-width: 11rem;
  margin: 0;
  padding: var(--space-1) 0;
  list-style: none;
  background: var(--surface-raised);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.menu__item {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-4);
  border: none;
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.menu__item:hover {
  background: var(--accent);
  color: #fff;
}

.menu__item--danger {
  color: var(--no);
}

.menu__item--danger:hover {
  background: var(--no);
  color: #2a0708;
}
```

- [ ] **Step 6: Прогнать всё и закоммитить**

```bash
npm run test && npm run lint && npm run typecheck
```

Ожидается: 312 тестов зелёные (295 прежних, 5 из задачи 2, 12 из этой), линтер и типы чисто.

```bash
git add src/components/DeckMenu.tsx src/components/DeckMenu.test.tsx src/styles/components.css
git commit -m "feat: add a keyboard-operable deck action menu

Replaces three always-visible links per deck row. Focus enters on open,
Escape and selection both return it to the button, arrows wrap, and a click
outside closes without selecting.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Библиотека — сетка карточек

`DeckRow` превращается в `DeckCard`: строка во всю ширину становится карточкой в сетке, а три всегда видимые ссылки уходят в меню из задачи 3. Режимы переименования и подтверждения удаления сохраняются полностью, включая фокус на «отмена».

**Важно про тесты.** `DeckRow.test.tsx` удаляется вместе с компонентом, но **все его проверки должны переехать** в `DeckCard.test.tsx`. На Этапе 1 замена тестового файла целиком дважды молча выкинула покрытие — сначала два теста режима колец, потом проверку `startedMode`. Перед удалением выпишите список того, что доказывал старый файл, и сверьтесь с ним после.

**Files:**
- Create: `src/components/DeckCard.tsx`, `src/components/DeckCard.test.tsx`
- Delete: `src/components/DeckRow.tsx`, `src/components/DeckRow.test.tsx`
- Modify: `src/screens/LibraryScreen.tsx`, `src/screens/LibraryScreen.test.tsx`, `src/App.test.tsx`, `src/styles/components.css`, `src/styles/screens.css`, `e2e/library.spec.ts`

**Interfaces:**
- Consumes: `DeckMenu`, `MenuItem` из `@/components/DeckMenu`; `Deck` из `@/core/library`; `cardsCount` из `@/core/plural`
- Produces: `export default function DeckCard({ deck, onOpen, onRename, onDelete, onExport })` — те же пропсы, что у `DeckRow`

- [ ] **Step 1: Выписать, что доказывал старый тест**

```bash
grep -n "^  it(\|^    it(" src/components/DeckRow.test.tsx
```

Сохраните вывод: это контрольный список для шага 6. Ни одна из этих проверок не должна исчезнуть без объяснения.

- [ ] **Step 2: Написать тесты `DeckCard`**

Создайте `src/components/DeckCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeckCard from '@/components/DeckCard';
import { createDeck } from '@/core/library';
import type { Deck } from '@/core/library';
import type { Card } from '@/core/deck';

const AT = new Date(2026, 8, 16);
const CARDS: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function deck(over: Partial<Deck> = {}): Deck {
  return { ...createDeck('Юнит 1', CARDS, AT), ...over };
}

function setup(over: Partial<Deck> = {}) {
  const props = { onOpen: vi.fn(), onRename: vi.fn(), onDelete: vi.fn(), onExport: vi.fn() };
  const user = userEvent.setup();
  render(<DeckCard deck={deck(over)} {...props} />);
  return { user, ...props };
}

/** Кнопка меню: у неё в доступном имени стоит название колоды. */
function menuButton() {
  return screen.getByRole('button', { name: /Действия с колодой/ });
}

describe('DeckCard, обычный вид', () => {
  it('показывает название и объём колоды', () => {
    setup();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
    expect(screen.getByText('2 карточки')).toBeInTheDocument();
  });

  it('открывает колоду по нажатию на карточку', async () => {
    const { user, onOpen } = setup();
    await user.click(screen.getByRole('button', { name: /^Юнит 1/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('помечает незаконченную тренировку', () => {
    setup({
      session: {
        mode: 'simple', round: 1, queue: ['c1'], nextRound: [],
        perfectRound: true, finalRound: false, finished: false,
      },
    });
    expect(screen.getByText('тренировка не закончена')).toBeInTheDocument();
  });

  it('законченную тренировку не помечает', () => {
    setup({
      session: {
        mode: 'simple', round: 1, queue: [], nextRound: [],
        perfectRound: true, finalRound: false, finished: true,
      },
    });
    expect(screen.queryByText('тренировка не закончена')).not.toBeInTheDocument();
  });

  // Название колоды в имени кнопки — чтобы читалка не произносила «Действия»
  // подряд столько раз, сколько колод в библиотеке.
  it('в имени кнопки меню стоит название колоды', () => {
    setup();
    expect(menuButton()).toHaveAccessibleName('Действия с колодой «Юнит 1»');
  });
});

describe('DeckCard, переименование', () => {
  it('пункт меню открывает поле с текущим именем', async () => {
    const { user } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Переименовать' }));

    expect(screen.getByLabelText('Название колоды')).toHaveValue('Юнит 1');
  });

  it('сохраняет новое имя', async () => {
    const { user, onRename } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Переименовать' }));
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.type(screen.getByLabelText('Название колоды'), 'Юнит 2');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onRename).toHaveBeenCalledWith('Юнит 2');
  });

  it('Enter сохраняет, Escape отменяет и возвращает прежнее имя', async () => {
    const { user, onRename } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Переименовать' }));
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.type(screen.getByLabelText('Название колоды'), 'Черновик{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
  });

  it('пустое имя не сохраняется, кнопка заблокирована', async () => {
    const { user, onRename } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Переименовать' }));
    await user.clear(screen.getByLabelText('Название колоды'));

    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(onRename).not.toHaveBeenCalled();
  });

  it('имя из одних пробелов тоже не сохраняется', async () => {
    const { user } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Переименовать' }));
    await user.clear(screen.getByLabelText('Название колоды'));
    await user.type(screen.getByLabelText('Название колоды'), '   ');

    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  });
});

describe('DeckCard, удаление', () => {
  it('пункт меню спрашивает подтверждение, а не удаляет сразу', async () => {
    const { user, onDelete } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Удалить' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Удалить вместе с прогрессом?')).toBeInTheDocument();
  });

  // Фокус на «отмена», а не на «Удалить»: случайный Enter не должен стирать
  // колоду — ровно ради этого подтверждение и существует.
  it('фокус уходит на отмену', async () => {
    const { user } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Удалить' }));

    expect(screen.getByRole('button', { name: /^отмена/ })).toHaveFocus();
  });

  it('подтверждение удаляет', async () => {
    const { user, onDelete } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Удалить' }));
    await user.click(screen.getByRole('button', { name: /^Удалить «/ }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('отмена ничего не делает и возвращает обычный вид', async () => {
    const { user, onDelete } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Удалить' }));
    await user.click(screen.getByRole('button', { name: /^отмена/ }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Юнит 1')).toBeInTheDocument();
  });
});

describe('DeckCard, выгрузка', () => {
  it('пункт меню запускает выгрузку', async () => {
    const { user, onExport } = setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Выгрузить таблицей' }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

```bash
npm run test -- src/components/DeckCard.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/components/DeckCard"».

- [ ] **Step 4: Реализовать `DeckCard`**

Создайте `src/components/DeckCard.tsx`:

```tsx
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
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```bash
npm run test -- src/components/DeckCard.test.tsx
```

Ожидается: 15 тестов зелёные.

- [ ] **Step 6: Сверить покрытие со старым файлом**

Сравните список из шага 1 с новым файлом. Каждая старая проверка должна иметь соответствие. Если какая-то не переехала — либо перенесите её, либо запишите в отчёт, почему она больше не применима (например, проверка на подчёркнутую ссылку «переименовать», которой теперь нет). **Молча терять проверку нельзя.**

Затем удалите старый компонент и его тест:

```bash
git rm src/components/DeckRow.tsx src/components/DeckRow.test.tsx
```

- [ ] **Step 7: Переключить библиотеку на сетку**

В `src/screens/LibraryScreen.tsx` замените импорт

```tsx
import DeckRow from '@/components/DeckRow';
```

на

```tsx
import DeckCard from '@/components/DeckCard';
```

и замените блок списка

```tsx
          <ul className="library__list">
            {byRecent(decks).map((deck) => (
              <li key={deck.id}>
                <DeckRow
```

на

```tsx
          <ul className="library__grid">
            {byRecent(decks).map((deck) => (
              <li key={deck.id}>
                <DeckCard
```

Остальное внутри `map` — пропсы `onOpen`, `onRename`, `onDelete`, `onExport` — не меняется.

- [ ] **Step 8: Заменить стили строки на стили сетки**

В `src/styles/screens.css` удалите правило `.library__list` и вместо него добавьте:

```css
.library__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 55rem) {
  .library__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 40rem) {
  .library__grid {
    grid-template-columns: 1fr;
  }
}
```

В `src/styles/components.css` удалите все правила с префиксом `.deck-row` (включая блок `@media (max-width: 40rem)`, который складывал строку) и добавьте:

```css
.deck-card {
  position: relative;
  height: 100%;
  min-height: 8.5rem;
  display: flex;
  align-items: flex-start;
  background: var(--surface);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.deck-card:hover {
  border-color: var(--accent);
}

.deck-card--editing {
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4);
}

.deck-card__open {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  /* Место под кнопку меню: без него длинное название заезжает под «⋯». */
  padding-right: 2.75rem;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
}

.deck-card__name {
  font-weight: var(--weight-bold);
  overflow-wrap: anywhere;
}

.deck-card__count {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.deck-card__unfinished {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.8rem;
  color: var(--accent);
}

.deck-card__unfinished::before {
  content: '';
  width: 0.4rem;
  height: 0.4rem;
  border-radius: var(--radius-pill);
  background: var(--accent);
}

.deck-card__menu {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
}

.deck-card__rename-label {
  display: block;
  width: 100%;
}

.deck-card__rename {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font: inherit;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--surface-raised);
  border-radius: var(--radius-sm);
}

.deck-card__confirm {
  margin: 0;
  text-align: center;
}

.deck-card__buttons {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
}

.btn--danger {
  background: var(--no);
  color: #2a0708;
}
```

Класс `.visually-hidden` уже существует в проекте — он использовался подписью поля переименования в `DeckRow`. Если при переносе правил в задаче 1 он оказался в `screens.css`, перенесите его в `components.css`: он общий.

- [ ] **Step 9: Починить тесты библиотеки и приложения**

Тесты, которые искали кнопки `переименовать` / `выгрузить` / `удалить` напрямую, теперь должны сначала открыть меню. В `src/screens/LibraryScreen.test.tsx` и `src/App.test.tsx` найдите такие места:

```bash
grep -n "переименовать\|выгрузить «\|удалить «" src/screens/LibraryScreen.test.tsx src/App.test.tsx
```

Перед каждым кликом по действию вставьте открытие меню, например:

```tsx
await user.click(screen.getByRole('button', { name: 'Действия с колодой «Юнит 2»' }));
await user.click(screen.getByRole('menuitem', { name: 'Выгрузить таблицей' }));
```

**Проверки при этом не ослабляются:** тест по-прежнему доказывает, что выгрузка выдаёт файл с тем же именем и содержимым, просто путь к кнопке стал на шаг длиннее.

- [ ] **Step 10: Починить сквозные тесты**

В `e2e/library.spec.ts` действия над колодой тоже переехали в меню. Замените

```ts
  await page.getByRole('button', { name: /^переименовать/ }).click();
```

на

```ts
  await page.getByRole('button', { name: 'Действия с колодой «Юнит 1»' }).click();
  await page.getByRole('menuitem', { name: 'Переименовать' }).click();
```

и аналогично для удаления:

```ts
  await page.getByRole('button', { name: 'Действия с колодой «Переименованная»' }).click();
  await page.getByRole('menuitem', { name: 'Удалить' }).click();
```

Селектор кнопки открытия колоды (`{ name: /^Юнит 1/ }`) остаётся: у карточки то же доступное имя, что было у строки.

- [ ] **Step 11: Прогнать всё**

```bash
npm run test && npm run lint && npm run typecheck && npm run test:e2e
```

Ожидается: модульные и сквозные зелёные. Если в `e2e` падает клик по пункту меню — проверьте, что `pointerdown` на документе не закрывает меню раньше, чем срабатывает `click` по пункту: пункт лежит внутри `list`, и обработчик из задачи 3 обязан его пропустить.

- [ ] **Step 12: Коммит**

```bash
git add src/components/ src/screens/LibraryScreen.tsx src/screens/LibraryScreen.test.tsx src/App.test.tsx src/styles/ e2e/library.spec.ts
git commit -m "feat: lay the library out as a grid of deck cards

Rows spanning the full width become cards in a grid, and the three
always-visible links move into the action menu.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Выбор режима — чипы и плитки

Радиокнопки направления в рамке занимают столько же места, сколько сами режимы, хотя это второстепенный выбор. Они становятся чипами, а режимы — цветными плитками.

**Плиток ровно две.** Заглушек для режимов Этапа 2b нет: обещать то, чего не существует, хуже, чем не обещать ничего.

**Files:**
- Create: `src/components/ModeTile.tsx`, `src/components/ModeTile.test.tsx`
- Modify: `src/screens/ModeScreen.tsx`, `src/screens/ModeScreen.test.tsx`, `src/styles/components.css`, `src/styles/screens.css`

**Interfaces:**
- Consumes: `SessionMode` из `@/core/session`
- Produces: `export default function ModeTile({ mode, name, hint, onStart })`, где `mode: SessionMode` определяет цвет

- [ ] **Step 1: Написать тесты плитки**

Создайте `src/components/ModeTile.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModeTile from '@/components/ModeTile';

describe('ModeTile', () => {
  it('показывает название и пояснение', () => {
    render(<ModeTile mode="simple" name="Просмотр" hint="Один круг, без повторов" onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Просмотр/ })).toBeInTheDocument();
    expect(screen.getByText('Один круг, без повторов')).toBeInTheDocument();
  });

  it('запускает режим по нажатию', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<ModeTile mode="ring" name="Кольца по 7" hint="Блоками" onStart={onStart} />);

    await user.click(screen.getByRole('button', { name: /Кольца по 7/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  // Цвет — часть опознания режима, и на Этапе 2b режимов станет шесть.
  // Класс проверяется, потому что от него зависит, какой цвет возьмёт плитка.
  it('берёт класс по режиму', () => {
    const { rerender } = render(
      <ModeTile mode="simple" name="Просмотр" hint="" onStart={vi.fn()} />,
    );
    expect(screen.getByRole('button')).toHaveClass('mode-tile--simple');

    rerender(<ModeTile mode="ring" name="Кольца по 7" hint="" onStart={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveClass('mode-tile--ring');
  });

  // Пояснение — часть доступного имени: без него читалка произносит только
  // «Просмотр», и чем он отличается от колец, неясно.
  it('пояснение входит в доступное имя', () => {
    render(<ModeTile mode="simple" name="Просмотр" hint="Один круг, без повторов" onStart={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Просмотр. Один круг, без повторов');
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/components/ModeTile.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/components/ModeTile"».

- [ ] **Step 3: Реализовать плитку**

Создайте `src/components/ModeTile.tsx`:

```tsx
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
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
npm run test -- src/components/ModeTile.test.tsx
```

Ожидается: 4 теста зелёные.

- [ ] **Step 5: Переписать экран выбора режима**

В `src/screens/ModeScreen.tsx` добавьте импорт:

```tsx
import ModeTile from '@/components/ModeTile';
```

Замените блок `<fieldset className="mode__directions">` целиком на чипы:

```tsx
      <fieldset className="mode__directions">
        <legend className="visually-hidden">Что спрашиваем</legend>
        {DIRECTIONS.map((value) => {
          const disabled = value === 'hanzi-to-pinyin' && !pinyinAvailable;
          return (
            <label key={value} className="chip">
              <input
                type="radio"
                name="direction"
                value={value}
                checked={direction === value}
                disabled={disabled}
                onChange={() => dispatch({ type: 'direction-changed', direction: value })}
              />
              <span>{DIRECTION_LABELS[value]}</span>
            </label>
          );
        })}
      </fieldset>
      {!pinyinAvailable && <p className="mode__hint">В колоде нет пиньиня</p>}
```

Обратите внимание: `mode__hint` вынесен **за** `fieldset`. Внутри рамки он читался как часть группы переключателей; снаружи он поясняет, почему один чип недоступен.

Замените блок `<div className="mode__buttons">` целиком:

```tsx
      <div className="mode__tiles">
        <ModeTile
          mode="simple"
          name="Просмотр"
          hint="Один круг, без повторов"
          onStart={() => dispatch({ type: 'session-started', mode: 'simple' })}
        />
        <ModeTile
          mode="ring"
          name="Кольца по 7"
          hint="Блоками, до полного круга"
          onStart={() => dispatch({ type: 'session-started', mode: 'ring' })}
        />
      </div>
```

**Надписи кнопок изменились** — «Простой просмотр» стал «Просмотр», «Заучивание кольцами по 7» стало «Кольца по 7». Это ломает существующие тесты; чинится на шаге 7.

- [ ] **Step 6: Добавить стили чипов и плиток**

В `src/styles/components.css` допишите:

```css
.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.85rem;
  border: 1.5px solid var(--surface-raised);
  border-radius: var(--radius-pill);
  color: var(--text-muted);
  font-size: 0.9rem;
  cursor: pointer;
}

/* Сам переключатель не показываем, но оставляем в потоке: он несёт роль,
   имя и состояние для читалки, и по нему же ходят стрелки внутри группы. */
.chip input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.chip:has(input:checked) {
  border-color: var(--accent);
  background: #4255ff26;
  color: var(--text);
  font-weight: var(--weight-semibold);
}

.chip:has(input:disabled) {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Кольцо фокуса рисует сам чип: визуально скрытый input показать негде. */
.chip:has(input:focus-visible) {
  box-shadow: var(--focus-ring);
}

.mode-tile {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-height: 9rem;
  padding: var(--space-4);
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.mode-tile--simple {
  background: var(--mode-simple);
  color: #fff;
}

.mode-tile--ring {
  background: var(--mode-ring);
  color: var(--mode-ring-text);
}

.mode-tile__name {
  font-size: 1.05rem;
  font-weight: var(--weight-bold);
}

.mode-tile__hint {
  font-size: 0.82rem;
  opacity: 0.85;
}

.mode-tile__preview {
  display: flex;
  gap: var(--space-1);
  align-items: flex-end;
  height: 2.4rem;
  margin-top: auto;
}

.mode-tile__preview i {
  width: 1.5rem;
  border-radius: var(--radius-sm);
  background: currentColor;
  opacity: 0.25;
}

.mode-tile__preview i:nth-child(1) { height: 1.9rem; }
.mode-tile__preview i:nth-child(2) { height: 2.4rem; opacity: 0.4; }
.mode-tile__preview i:nth-child(3) { height: 1.4rem; }
```

В `src/styles/screens.css` замените правила `.mode__directions`, `.mode__directions label`, `.mode__directions label:has(input:disabled)` и `.mode__buttons` на:

```css
.mode__directions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
}

.mode__tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  width: min(90vw, 28rem);
}

@media (max-width: 40rem) {
  .mode__tiles {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: Починить тесты, где менялись надписи**

Найдите все места со старыми надписями:

```bash
grep -rn "Простой просмотр\|Заучивание кольцами" src/ e2e/ e2e-subpath/
```

В каждом замените `'Простой просмотр'` на `/^Просмотр/` и `'Заучивание кольцами по 7'` на `/^Кольца по 7/`. Регулярное выражение с якорем, а не точная строка: доступное имя плитки включает пояснение («Просмотр. Один круг, без повторов»), и точное совпадение больше не сработает.

**Проверка при этом не ослабляется:** тест по-прежнему требует, чтобы существовала кнопка, запускающая именно этот режим.

- [ ] **Step 8: Прогнать всё**

```bash
npm run test && npm run lint && npm run typecheck && npm run test:e2e
```

Ожидается: всё зелёное.

- [ ] **Step 9: Коммит**

```bash
git add src/components/ModeTile.tsx src/components/ModeTile.test.tsx src/screens/ src/styles/ e2e/
git commit -m "feat: turn mode selection into coloured tiles and chips

Radio buttons in a bordered group took as much room as the modes themselves
for a secondary choice. Colour gives each mode an identity the reader
recognises before reading the label.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Тренировка — непрерывная подкраска и цветные счётчики

Контур подкраски уже есть, но включается ступенькой: `Card.tsx` вешает `card--yes` / `card--no` при смещении больше `TINT_THRESHOLD` (20 пикселей), и цвет появляется скачком на полную яркость. Становится непрерывным.

**Files:**
- Modify: `src/components/Card.tsx`, `src/components/Card.test.tsx`, `src/components/Counters.tsx`, `src/components/Counters.test.tsx`, `src/screens/TrainingScreen.tsx`, `src/styles/components.css`, `src/styles/screens.css`

**Interfaces:**
- Consumes: `SWIPE_THRESHOLD` из `@/hooks/useSwipeGesture`
- Produces: `Card` с непрерывной подкраской; публичный интерфейс пропсов не меняется

- [ ] **Step 1: Написать падающие тесты подкраски**

Допишите в `src/components/Card.test.tsx` новый блок. Если в файле ещё нет импорта `SWIPE_THRESHOLD`, добавьте его:

```tsx
import { SWIPE_THRESHOLD } from '@/hooks/useSwipeGesture';
```

В файле уже есть фикстуры `card` и `handlers` и помощник `renderCard` — новый блок пользуется ими, второго комплекта заводить не нужно.

```tsx
describe('Card, подкраска по ходу жеста', () => {
  function renderDragged(dragX: number, exiting: 'left' | 'right' | null = null) {
    const { container } = render(
      <Card
        front={frontFace(card, 'hanzi-to-translation')}
        back={backFace(card, 'hanzi-to-translation')}
        flipped={false}
        dragX={dragX}
        dragging={dragX !== 0}
        exiting={exiting}
        handlers={handlers}
      />,
    );
    const node = container.querySelector('.card') as HTMLElement;
    return {
      yes: Number(node.style.getPropertyValue('--tint-yes')),
      no: Number(node.style.getPropertyValue('--tint-no')),
    };
  }

  const tint = (dragX: number) => renderDragged(dragX);

  it('без жеста подкраски нет', () => {
    expect(tint(0)).toEqual({ yes: 0, no: 0 });
  });

  // Ступенька на 20 пикселях заменена на непрерывный рост: на половине пути
  // подкраска ровно вполовину.
  it('на половине порога подкрашена наполовину', () => {
    expect(tint(SWIPE_THRESHOLD / 2).yes).toBeCloseTo(0.5, 2);
  });

  it('на пороге подкрашена полностью', () => {
    expect(tint(SWIPE_THRESHOLD).yes).toBe(1);
  });

  // Дальше порога свайп уже засчитан, ярче становиться некуда.
  it('за порогом не переливается через единицу', () => {
    expect(tint(SWIPE_THRESHOLD * 3).yes).toBe(1);
  });

  it('влево красит красным, а не зелёным', () => {
    const { yes, no } = tint(-SWIPE_THRESHOLD);
    expect(no).toBe(1);
    expect(yes).toBe(0);
  });

  it('при отъезде подкраска на максимуме', () => {
    expect(renderDragged(0, 'right').yes).toBe(1);
  });
});
```

Переменные читаются из `node.style`, а не из `getComputedStyle`: jsdom не считает каскад, но инлайновые свойства, которые ставит сам компонент, в `style` видны.

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/components/Card.test.tsx
```

Ожидается: FAIL — переменной `--tint-yes` нет, значения читаются как `NaN`.

- [ ] **Step 3: Сделать подкраску непрерывной**

В `src/components/Card.tsx` замените константу

```tsx
const TINT_THRESHOLD = 20;
```

на импорт порога (добавьте его к импортам сверху):

```tsx
import { SWIPE_THRESHOLD } from '@/hooks/useSwipeGesture';
```

Замените расчёт `className` и `style` на:

```tsx
  // Непрерывный рост вместо ступеньки: подкраска достигает максимума ровно
  // там, где отпускание засчитает свайп. Раньше цвет включался скачком на
  // двадцати пикселях и до самого порога врал, что свайп уже состоялся.
  const strength = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
  const tintYes = exiting === 'right' ? 1 : dragX > 0 ? strength : 0;
  const tintNo = exiting === 'left' ? 1 : dragX < 0 ? strength : 0;

  const className = [
    'card',
    dragging ? 'card--dragging' : '',
    exiting !== null ? 'card--exiting' : '',
  ]
    .filter((name) => name !== '')
    .join(' ');
```

и передайте силу подкраски в стиль:

```tsx
    <div
      className={className}
      style={
        {
          transform: `translateX(${offset}px) rotate(${offset / 20}deg)`,
          '--tint-yes': tintYes,
          '--tint-no': tintNo,
        } as CSSProperties
      }
```

Приведение нужно потому, что `CSSProperties` не знает про пользовательские свойства. Замените строку импорта типов в начале файла на:

```tsx
import type { CSSProperties, PointerEventHandler } from 'react';
```

Внутрь `<div className={className}>`, первым потомком перед `card__body`, добавьте слои подкраски и штампы:

```tsx
      <div className="card__tint card__tint--yes" aria-hidden="true" />
      <div className="card__tint card__tint--no" aria-hidden="true" />
      <div className="card__stamp card__stamp--yes" aria-hidden="true">
        ЗНАЮ
      </div>
      <div className="card__stamp card__stamp--no" aria-hidden="true">
        СНОВА
      </div>
```

Штампы скрыты от читалки намеренно: для незрячего пользователя направление свайпа задаётся стрелками с клавиатуры, и результат сообщают счётчики, а не надпись на карточке.

- [ ] **Step 4: Стили подкраски**

В `src/styles/components.css` замените правила `.card--yes` и `.card--no` на:

```css
.card {
  position: relative;
  overflow: hidden;
}

.card__tint {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card__tint--yes {
  background: #3ccf9124;
  opacity: var(--tint-yes, 0);
}

.card__tint--no {
  background: #ff5a5f24;
  opacity: var(--tint-no, 0);
}

.card__stamp {
  position: absolute;
  top: var(--space-4);
  padding: 0.2rem 0.55rem;
  border: 2.5px solid currentColor;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: var(--weight-heavy);
  letter-spacing: 0.08em;
  pointer-events: none;
}

.card__stamp--yes {
  right: var(--space-4);
  color: var(--yes);
  opacity: var(--tint-yes, 0);
  transform: rotate(9deg);
}

.card__stamp--no {
  left: var(--space-4);
  color: var(--no);
  opacity: var(--tint-no, 0);
  transform: rotate(-9deg);
}
```

Правило `.card` уже существует выше в файле — там задано `border: 3px solid transparent`. Замените его на непрерывный контур:

```css
  border: 3px solid transparent;
  /* Контур растёт вместе с подкраской. color-mix даёт цвет нужной
     насыщенности из одной переменной, без второго слоя. */
  border-color: color-mix(
    in srgb,
    var(--yes) calc(var(--tint-yes, 0) * 100%),
    color-mix(in srgb, var(--no) calc(var(--tint-no, 0) * 100%), transparent)
  );
```

- [ ] **Step 5: Убедиться, что тесты подкраски проходят**

```bash
npm run test -- src/components/Card.test.tsx
```

Ожидается: все зелёные, включая прежние тесты файла.

- [ ] **Step 6: Цветные счётчики**

Допишите в `src/components/Counters.test.tsx`:

```tsx
  it('счётчики подписаны значками, а не только цветом', () => {
    render(<Counters known={9} unknown={3} />);
    expect(screen.getByTestId('count-known').textContent).toContain('9');
    expect(screen.getByTestId('count-unknown').textContent).toContain('3');
  });
```

Замените `src/components/Counters.tsx` на:

```tsx
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
```

**Осторожно:** тесты, которые сравнивают текст счётчика точно (`toHaveText('9')`), теперь получат `'✓ 9'`. Найдите их и замените точное сравнение на вхождение:

```bash
grep -rn "count-known\|count-unknown" src/ e2e/
```

В сквозных тестах `toHaveText(String(done))` меняется на `toContainText(String(done))`. **Проверка не ослабляется:** счётчик по-прежнему обязан показать именно это число, просто рядом с ним теперь стоит значок.

В `src/styles/components.css` замените `.counter--yes` и `.counter--no`:

```css
.counter {
  min-width: 3rem;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-pill);
  font-weight: var(--weight-bold);
  font-variant-numeric: tabular-nums;
}

.counter--yes {
  background: #3ccf9126;
  color: var(--yes);
}

.counter--no {
  background: #ff5a5f26;
  color: var(--no);
}
```

- [ ] **Step 7: Полоса прогресса в строку шапки**

В `src/screens/TrainingScreen.tsx` перенесите простой прогресс внутрь `<header>`. Замените

```tsx
        <p className="training__progress">{progressText(session)}</p>
      </header>
```

на

```tsx
        {session.mode === 'simple' && <SimpleProgress {...roundProgress(session)} />}
        <p className="training__progress">{progressText(session)}</p>
      </header>
```

и замените блок под шапкой

```tsx
      {session.mode === 'simple' ? (
        <SimpleProgress {...roundProgress(session)} />
      ) : (
        <RingProgress {...ringProgress(session)} />
      )}
```

на

```tsx
      {/* Сегменты режима колец остаются отдельной строкой: их до восьми,
          в строку шапки они не помещаются. */}
      {session.mode === 'ring' && <RingProgress {...ringProgress(session)} />}
```

В `src/styles/screens.css` дополните `.training__header`:

```css
.training__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: var(--card-width);
}
```

и в `src/styles/components.css` замените `.progress`:

```css
.progress {
  flex: 1;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-pill);
  transition: width 200ms ease;
}
```

- [ ] **Step 8: Покрасить кнопки ответа**

В `src/screens/TrainingScreen.tsx` в блоке `training__buttons` замените классы двух кнопок:

```tsx
        <button type="button" className="btn btn--no" onClick={() => commitSwipe('left')}>
          Изучать снова
        </button>
        <button type="button" className="btn btn--yes" onClick={() => commitSwipe('right')}>
          Знаю
        </button>
```

В `src/styles/components.css` допишите:

```css
/* Приглушённая заливка, не сплошная: у проектора контраст хуже, чем у
   монитора, и сплошной цвет на стене слепит. */
.btn--yes {
  background: #3ccf912e;
  color: var(--yes);
  border: 1.5px solid #3ccf916b;
}

.btn--no {
  background: #ff5a5f2e;
  color: var(--no);
  border: 1.5px solid #ff5a5f6b;
}
```

- [ ] **Step 9: Прогнать всё**

```bash
npm run test && npm run lint && npm run typecheck && npm run test:e2e
```

Ожидается: всё зелёное. Вывод тестов чистый, предупреждений React нет.

Отдельно проследите за двумя тестами в `src/screens/TrainingScreen.test.tsx`, которые эта задача легко ломает разметкой:

- «во время анимации ввод заблокирован» — второе нажатие во время отъезда карточки игнорируется намеренно, и это правильно: следующая карточка ещё не показана, засчитывать ответ на невидимую нельзя;
- «„В библиотеку“ и „Загрузить новую таблицу“ недоступны, пока карточка уезжает: свайп не теряется» — правка Этапа 1.

Оба обязаны остаться зелёными **без изменений**. Если они покраснели, чинится код, а не тест.

- [ ] **Step 10: Коммит**

```bash
git add src/components/ src/screens/TrainingScreen.tsx src/styles/ e2e/
git commit -m "feat: make swipe feedback continuous and colour the counters

The tint used to switch on in one step at 20px and then lie about the swipe
being committed until the 80px threshold. It now grows with the gesture and
peaks exactly where releasing counts.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Итоги — кольцо и набегание чисел

Строка «Знаю: 16 · Не знаю: 0» заменяется кольцом с процентом. Кольцо и оба счётчика набегают за 1400 мс: за это время видно не только результат, но и как он набрался.

**Files:**
- Create: `src/hooks/useCountUp.ts`, `src/hooks/useCountUp.test.tsx`, `src/components/ResultRing.tsx`, `src/components/ResultRing.test.tsx`
- Modify: `src/screens/DoneScreen.tsx`, `src/screens/DoneScreen.test.tsx`, `src/styles/components.css`, `src/styles/screens.css`

**Interfaces:**
- Consumes: `useReducedMotion` из `@/hooks/useReducedMotion`
- Produces:
  - `useCountUp(target: number, durationMs: number): number`
  - `export default function ResultRing({ percent }: { percent: number })`

- [ ] **Step 1: Написать тесты хука**

Создайте `src/hooks/useCountUp.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { useCountUp } from '@/hooks/useCountUp';

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useCountUp', () => {
  it('начинает с нуля', () => {
    mockReducedMotion(false);
    expect(renderHook(() => useCountUp(22, 1400)).result.current).toBe(0);
  });

  it('доходит ровно до цели, а не около неё', async () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useCountUp(22, 40));

    // Ждём по условию, а не по таймеру: анимация идёт на requestAnimationFrame,
    // и фиктивные таймеры его не двигают.
    await vi.waitFor(() => expect(result.current).toBe(22), { timeout: 2000 });
  });

  it('по дороге не перескакивает цель', async () => {
    mockReducedMotion(false);
    const seen: number[] = [];
    const { result, rerender } = renderHook(() => useCountUp(22, 60));

    await vi.waitFor(() => {
      seen.push(result.current);
      rerender();
      expect(result.current).toBe(22);
    }, { timeout: 2000 });

    expect(Math.max(...seen)).toBeLessThanOrEqual(22);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
  });

  // При отключённом движении числу набегать неоткуда: оно сразу готово.
  it('с prefers-reduced-motion показывает цель сразу', () => {
    mockReducedMotion(true);
    expect(renderHook(() => useCountUp(22, 1400)).result.current).toBe(22);
  });

  it('ноль остаётся нулём', () => {
    mockReducedMotion(false);
    expect(renderHook(() => useCountUp(0, 1400)).result.current).toBe(0);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/hooks/useCountUp.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/hooks/useCountUp"».

- [ ] **Step 3: Реализовать хук**

Создайте `src/hooks/useCountUp.ts`:

```ts
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Число, набегающее от нуля до цели. Возвращает цель сразу, если пользователь
 * просил убрать движение: набегание там не информация, а украшение.
 */
export function useCountUp(target: number, durationMs: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced || durationMs <= 0) {
      setValue(target);
      return;
    }

    let frame = 0;
    const started = performance.now();

    function step(now: number) {
      const passed = Math.min((now - started) / durationMs, 1);
      // Замедление к концу: равномерный счёт выглядит механическим.
      const eased = 1 - Math.pow(1 - passed, 3);
      // round, а не floor: иначе последний кадр не дотягивает до цели.
      setValue(Math.round(target * eased));
      if (passed < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return value;
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
npm run test -- src/hooks/useCountUp.test.tsx
```

Ожидается: 5 тестов зелёные.

- [ ] **Step 5: Написать тесты кольца**

Создайте `src/components/ResultRing.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import ResultRing from '@/components/ResultRing';

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('ResultRing', () => {
  it('показывает процент', () => {
    mockReducedMotion(true);
    render(<ResultRing percent={86} />);
    expect(screen.getByText('86%')).toBeInTheDocument();
  });

  it('ноль показывается нулём, а не пустотой', () => {
    mockReducedMotion(true);
    render(<ResultRing percent={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  // Кольцо нарисовано графикой, и без роли с именем читалка о нём молчит.
  it('объявляет себя как индикатор с значением', () => {
    mockReducedMotion(true);
    render(<ResultRing percent={86} />);

    const meter = screen.getByRole('img', { name: 'Верных ответов: 86%' });
    expect(meter).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Реализовать кольцо**

Создайте `src/components/ResultRing.tsx`:

```tsx
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
          <circle className="result-ring__track" cx="68" cy="68" r={RADIUS} fill="none" strokeWidth="12" />
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
```

- [ ] **Step 7: Переписать экран итогов**

В `src/screens/DoneScreen.tsx` добавьте импорты:

```tsx
import Counters from '@/components/Counters';
import ResultRing from '@/components/ResultRing';
```

Замените тело между `<h1>Готово</h1>` и `<div className="done__buttons">` на:

```tsx
      <p className="done__info">{cardsCount(cards.length)}</p>

      <ResultRing percent={percentKnown(stats)} />
      <Counters known={stats.known} unknown={stats.unknown} />
```

и добавьте внизу файла:

```tsx
/** Доля верных за тренировку. Без ответов — ноль, а не деление на ноль. */
function percentKnown({ known, unknown }: { known: number; unknown: number }): number {
  const total = known + unknown;
  return total === 0 ? 0 : Math.round((known / total) * 100);
}
```

Строка `done__stats` со «Знаю: … · Не знаю: …» удаляется: те же числа теперь в счётчиках.

- [ ] **Step 8: Починить тесты итогов**

В `src/screens/DoneScreen.test.tsx` проверка `Знаю: 1 · Не знаю: 1` больше не найдёт текст. Замените её на проверку счётчиков и кольца — **это не ослабление, а то же утверждение в новой разметке**:

```tsx
  it('показывает, сколько знал и сколько нет', () => {
    // ...существующий рендер с known: 1, unknown: 1
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
    expect(screen.getByTestId('count-unknown')).toHaveTextContent('1');
    expect(screen.getByRole('img', { name: 'Верных ответов: 50%' })).toBeInTheDocument();
  });
```

Найдите остальные места со старой строкой:

```bash
grep -rn "Знаю: " src/ e2e/
```

В `e2e/training.spec.ts` проверка `Знаю: 16 · Не знаю: 0` заменяется на:

```ts
  await expect(page.getByRole('img', { name: 'Верных ответов: 100%' })).toBeVisible();
  await expect(page.getByTestId('count-known')).toContainText('16');
```

- [ ] **Step 9: Стили кольца**

В `src/styles/components.css` допишите:

```css
.result-ring {
  position: relative;
  width: 136px;
  height: 136px;
}

.result-ring__track {
  stroke: #ffffff1a;
}

.result-ring__fill {
  stroke: var(--yes);
  stroke-linecap: round;
}

.result-ring__value {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 1.8rem;
  font-weight: var(--weight-heavy);
  font-variant-numeric: tabular-nums;
}
```

В `src/styles/screens.css` удалите правило `.done__stats`, оставив `.done__info` и `.done__buttons` как есть.

- [ ] **Step 10: Прогнать всё и закоммитить**

```bash
npm run test && npm run lint && npm run typecheck && npm run test:e2e
```

```bash
git add src/hooks/useCountUp.ts src/hooks/useCountUp.test.tsx src/components/ResultRing.tsx src/components/ResultRing.test.tsx src/screens/DoneScreen.tsx src/screens/DoneScreen.test.tsx src/styles/ e2e/
git commit -m "feat: show the result as a ring that fills

A single line of text said how many were known. The ring shows the share and
counts up to it, so the result reads from the back of the room.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Переходы между экранами

Самая рискованная задача этапа: два экрана одновременно в DOM — это дубли заголовков, дубли полей и потерянный фокус. Поэтому уходящий экран помечается `inert`: он виден, но недоступен ни фокусу, ни читалке.

**Files:**
- Create: `src/components/ScreenTransition.tsx`, `src/components/ScreenTransition.test.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/styles/components.css`

**Interfaces:**
- Consumes: `Screen` из `@/state/appReducer`; `useReducedMotion` из `@/hooks/useReducedMotion`
- Produces: `export default function ScreenTransition({ screen, children })` — оборачивает разметку текущего экрана

- [ ] **Step 1: Написать падающие тесты**

Создайте `src/components/ScreenTransition.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import ScreenTransition from '@/components/ScreenTransition';

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

function Pane({ title }: { title: string }) {
  return (
    <section className="screen">
      <h1>{title}</h1>
      <button type="button">Кнопка {title}</button>
    </section>
  );
}

describe('ScreenTransition', () => {
  it('показывает текущий экран', () => {
    mockReducedMotion(true);
    render(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );
    expect(screen.getByRole('heading', { name: 'Мои колоды' })).toBeInTheDocument();
  });

  // Без этого человек с клавиатурой после перехода остаётся на кнопке,
  // которой больше нет на экране, и следующий Tab уводит в никуда.
  it('после смены экрана фокус уходит на заголовок нового', async () => {
    mockReducedMotion(true);
    const { rerender } = render(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );

    rerender(
      <ScreenTransition screen="mode">
        <Pane title="Колода готова" />
      </ScreenTransition>,
    );

    await vi.waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Колода готова' })).toHaveFocus(),
    );
  });

  it('задаёт направление вглубь при открытии колоды', () => {
    mockReducedMotion(false);
    const { container, rerender } = render(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );
    rerender(
      <ScreenTransition screen="mode">
        <Pane title="Колода готова" />
      </ScreenTransition>,
    );

    expect(container.querySelector('.transition')).toHaveClass('transition--forward');
  });

  it('задаёт направление назад при возврате в библиотеку', () => {
    mockReducedMotion(false);
    const { container, rerender } = render(
      <ScreenTransition screen="mode">
        <Pane title="Колода готова" />
      </ScreenTransition>,
    );
    rerender(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );

    expect(container.querySelector('.transition')).toHaveClass('transition--back');
  });

  // Уходящий экран виден, но не должен ловить фокус и не должен читаться:
  // иначе на странице два заголовка первого уровня и две одинаковые кнопки.
  it('уходящий экран недоступен фокусу и читалке', () => {
    mockReducedMotion(false);
    const { container, rerender } = render(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );
    rerender(
      <ScreenTransition screen="mode">
        <Pane title="Колода готова" />
      </ScreenTransition>,
    );

    const leaving = container.querySelector('.transition__pane--leaving');
    expect(leaving).not.toBeNull();
    expect(leaving).toHaveAttribute('inert');
    expect(leaving).toHaveAttribute('aria-hidden', 'true');
  });

  // При отключённом движении второго экрана в DOM быть не должно вовсе.
  it('с prefers-reduced-motion уходящий экран не рисуется', () => {
    mockReducedMotion(true);
    const { container, rerender } = render(
      <ScreenTransition screen="library">
        <Pane title="Мои колоды" />
      </ScreenTransition>,
    );
    rerender(
      <ScreenTransition screen="mode">
        <Pane title="Колода готова" />
      </ScreenTransition>,
    );

    expect(container.querySelector('.transition__pane--leaving')).toBeNull();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm run test -- src/components/ScreenTransition.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/components/ScreenTransition"».

- [ ] **Step 3: Реализовать переход**

Создайте `src/components/ScreenTransition.tsx`:

```tsx
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
  const [leaving, setLeaving] = useState<{ node: ReactNode; key: Screen } | null>(null);
  const [way, setWay] = useState<'forward' | 'back'>('forward');
  const previous = useRef<{ screen: Screen; node: ReactNode }>({ screen, node: children });
  const pane = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const was = previous.current;
    previous.current = { screen, node: children };
    if (was.screen === screen) return;

    setWay(direction(was.screen, screen));

    if (!reduced) {
      setLeaving({ node: was.node, key: was.screen });
      const timer = setTimeout(() => setLeaving(null), DURATION_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
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
          {leaving.node}
        </div>
      )}
      <div ref={pane} className="transition__pane transition__pane--entering" key={screen}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
npm run test -- src/components/ScreenTransition.test.tsx
```

Ожидается: 7 тестов зелёные. Если TypeScript ругается на `inert`, проверьте версию React: в 19 атрибут типизирован. При ошибке замените на `{...{ inert: '' }}` и добавьте комментарий почему.

- [ ] **Step 5: Подключить в приложении**

В `src/App.tsx` добавьте импорт:

```tsx
import ScreenTransition from '@/components/ScreenTransition';
```

и замените `{renderScreen(state.screen)}` на:

```tsx
      <ScreenTransition screen={state.screen}>{renderScreen(state.screen)}</ScreenTransition>
```

- [ ] **Step 6: Стили перехода**

В `src/styles/components.css` допишите:

```css
.transition {
  position: relative;
}

.transition__pane--leaving {
  position: absolute;
  inset: 0;
  animation: pane-leave 340ms cubic-bezier(0.3, 0.7, 0.3, 1) forwards;
}

.transition__pane--entering {
  animation: pane-enter 340ms cubic-bezier(0.3, 0.7, 0.3, 1);
}

@keyframes pane-enter {
  from {
    opacity: 0;
    transform: translateX(var(--pane-from, 22%));
  }
}

@keyframes pane-leave {
  to {
    opacity: 0;
    transform: translateX(var(--pane-to, -22%)) scale(0.96);
  }
}

.transition--forward {
  --pane-from: 22%;
  --pane-to: -22%;
}

.transition--back {
  --pane-from: -22%;
  --pane-to: 22%;
}
```

Общее правило `prefers-reduced-motion` из `base.css` сводит длительность к 0,01 мс, так что отдельного выключения здесь не нужно — а уходящий экран при этом и вовсе не монтируется.

- [ ] **Step 7: Проверить, что ничего не сломалось в приложении**

```bash
npm run test && npm run lint && npm run typecheck
```

Ожидается: всё зелёное. Если тесты `App.test.tsx` начали находить два одинаковых элемента — значит уходящий экран не помечен `inert` или `aria-hidden`, и `getByRole` видит оба.

- [ ] **Step 8: Сквозной тест фокуса после перехода**

Допишите в `e2e/focus.spec.ts`:

```ts
test('после перехода фокус на заголовке нового экрана', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Добавить колоду' }).click();

  const focused = await page.evaluate(() => document.activeElement?.tagName ?? '');
  expect(focused).toBe('H1');
});
```

- [ ] **Step 9: Прогнать сквозные и закоммитить**

```bash
npm run test:e2e && npm run test:e2e:subpath
```

```bash
git add src/components/ScreenTransition.tsx src/components/ScreenTransition.test.tsx src/App.tsx src/App.test.tsx src/styles/components.css e2e/focus.spec.ts
git commit -m "feat: move between screens with direction

Going deeper brings the new screen from the right, going back mirrors it.
The leaving screen is inert so it never holds focus or reaches a reader,
and focus lands on the new screen's heading.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Импорт, возобновление и уборка

Два оставшихся экрана получают токены, из проекта уходят синонимы, оставленные для переходного периода, и обновляется README.

**Files:**
- Modify: `src/styles/screens.css`, `src/styles/components.css`, `src/styles/tokens.css`, `README.md`

**Interfaces:**
- Consumes: шкалы из задачи 1
- Produces: ничего нового

- [ ] **Step 1: Привести экраны импорта и возобновления к токенам**

В `src/styles/screens.css` замените правила этих двух экранов на:

```css
.import__textarea {
  width: min(90vw, 48rem);
  min-height: 12rem;
  padding: var(--space-4);
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--surface-raised);
  border-radius: var(--radius-lg);
  resize: vertical;
}

.import__columns {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: center;
}

.import__preview {
  border-collapse: collapse;
  font-size: 0.9rem;
}

.import__preview th,
.import__preview td {
  padding: var(--space-1) var(--space-3);
  text-align: left;
}

.import__preview th {
  color: var(--text-muted);
  font-weight: var(--weight-semibold);
}

.import__more,
.import__message {
  margin: 0;
  color: var(--text-muted);
}

.resume__info,
.done__info {
  margin: 0;
  color: var(--text-muted);
}

.resume__buttons,
.done__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: center;
}
```

Значения взяты из прежних правил; менялись только единицы — литералы заменены на шкалу.

- [ ] **Step 2: Проверить, что экраны не разъехались**

```bash
npm run test && npm run build
```

Ожидается: зелёное. Затем посмотрите глазами — это единственная проверка, которую здесь нельзя автоматизировать:

```bash
npm run dev
```

Откройте экран импорта и экран возобновления, проверьте, что поля, таблица предпросмотра и кнопки на местах. Остановите сервер.

- [ ] **Step 3: Убрать переходные синонимы**

Задача 1 оставила `--radius` синонимом `--radius-lg`, чтобы не переписывать разметку раньше времени. Найдите оставшиеся использования:

```bash
grep -rn "var(--radius)" src/
```

Замените каждое так: `--radius-lg` в `.screen`, `.card`, `.btn`, `.import__textarea`, `.update-prompt`, `.training__confirm`; `--radius-md` в `.import__preview` и прочих мелких поверхностях, если они там встретятся. Если после замены останется случай, не подходящий ни под одну ступень, — не выдумывайте новую, возьмите ближайшую и отметьте это в отчёте. Затем удалите из `src/styles/tokens.css` строки

```css
  /* Старое имя оставлено синонимом: на него ссылается разметка, которую эта
     задача не трогает. Уходит вместе с последним использованием в задаче 9. */
  --radius: var(--radius-lg);
```

Повторите проверку, что `--radius` больше нигде нет:

```bash
grep -rn "var(--radius)" src/
```

Ожидается: пусто.

Переменную `--gap` **не трогайте**: она используется широко, и её переименование — работа без выгоды. Она остаётся синонимом `--space-4`.

- [ ] **Step 4: Обновить README**

В `README.md` найдите раздел о структуре проекта и приведите список стилей в соответствие. Замените упоминание `src/styles/app.css` на четыре файла:

```markdown
- `src/styles/tokens.css` — палитра и шкалы: скругления, тени, отступы, веса, кольцо фокуса
- `src/styles/base.css` — сброс, типографика, кольцо фокуса, общее правило `prefers-reduced-motion`
- `src/styles/components.css` — кнопки, карточки, таблетки, меню, прогресс, переходы
- `src/styles/screens.css` — правила, относящиеся к конкретным экранам
```

Если в README есть описание экранов, допишите, что действия над колодой открываются меню «⋯», а переходы между экранами направленные и отключаются системной настройкой «уменьшить движение».

- [ ] **Step 5: Финальная проверка**

```bash
npm run test && npm run lint && npm run typecheck && npm run build
npm run test:e2e && npm run test:e2e:subpath
```

Ожидается: всё зелёное на обоих стендах.

Дополнительно прогоните набор в поясе западнее Гринвича — на Этапе 1 там всплывали тесты, зависящие от часового пояса машины:

```bash
TZ=Pacific/Midway npm run test
```

- [ ] **Step 6: Коммит**

```bash
git add src/styles/ README.md
git commit -m "chore: finish the token pass and document the stylesheet split

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Проверка вручную перед слиянием

Автоматика не отвечает на один вопрос, ради которого этап и затевался: **читается ли это с задней парты через проектор.** Проверяет преподаватель.

1. Подкраска при свайпе: видно ли направление с расстояния и не слепит ли.
2. Кнопки «Изучать снова» и «Знаю»: различимы ли по цвету.
3. Плитки режимов: узнаются ли по цвету раньше, чем прочитана подпись.
4. Кольцо итогов: читается ли процент с задней парты.

Если что-то не читается — это правка значений в `tokens.css`, а не переделка разметки.
