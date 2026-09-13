# Карточки 汉字, Этап 0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести прототип карточек на React + TypeScript + Vite с китайской моделью карточки (иероглиф / пиньинь / перевод), выбором направления вопроса, офлайн-режимом (PWA) и автоматической публикацией, сохранив оба существующих режима тренировки.

**Architecture:** Три слоя с жёсткой границей. `src/core` — чистые типизированные функции (разбор таблицы, пиньинь, машина состояний тренировки, хранилище) без единого импорта React и без прямого обращения к `window` и `document`. `src/state` — редьюсер на `useReducer`, который только вызывает функции `core`. `src/screens`, `src/components`, `src/hooks` — слой представления, не содержащий правил тренировки.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + jsdom + React Testing Library, Playwright, ESLint, Prettier, `vite-plugin-pwa`, GitHub Actions, GitHub Pages.

**Спецификация:** [docs/superpowers/specs/2026-09-12-hanzi-cards-stage0-design.md](../specs/2026-09-12-hanzi-cards-stage0-design.md)

## Global Constraints

- Node.js версии из `.nvmrc` (24) или новее. Node 20 не подходит: `jsdom` требует
  `^22.22.2 || ^24.15.0 || >=26.0.0`, а `vitest` — `^22.12.0 || ^24.0.0 || >=26.0.0`.
- Весь интерфейс на русском языке. Идентификаторы, имена файлов, сообщения коммитов — на английском.
- `src/core/**` не импортирует React и не обращается к `window` или `document`. Доступ к `localStorage` передаётся параметром типа `StorageLike`.
- Ключ хранилища ровно один: `flashcards.v2`. Поле `version` внутри равно `2`.
- Старый ключ `flashcards.state.v1` не читается, не пишется и не удаляется.
- Размер блока в режиме колец — 7 карточек, константа `BLOCK_SIZE`.
- Порог засчитывания свайпа — 80 пикселей, константа `SWIPE_THRESHOLD`.
- Шрифты для иероглифов только системные: `"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`. Веб-шрифты для CJK не подключаются — они весят мегабайты и сломают офлайн-режим.
- Имя репозитория и папки — `hanzi-cards`. От него зависит `DEPLOY_BASE` в workflow публикации.
- Никаких стор-библиотек (Redux, Zustand, MobX) и никаких UI-китов. Только React и его штатные средства.
- Каждая задача заканчивается коммитом. Коммиты в стиле Conventional Commits.
- Сообщения коммитов заканчиваются строкой `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

| Файл | Ответственность |
|------|-----------------|
| `src/core/id.ts` | Генерация идентификатора карточки |
| `src/core/deck.ts` | Типы `Card` и `Direction`, разбиение на блоки, содержимое сторон карточки |
| `src/core/pinyin.ts` | Перевод пиньиня из цифровой записи в диакритику |
| `src/core/parse.ts` | Разбор вставленной таблицы в массив карточек |
| `src/core/session.ts` | Машина состояний тренировки: простой режим и кольца |
| `src/core/storage.ts` | Сериализация, валидация и чтение сохранённого состояния |
| `src/state/appReducer.ts` | Редьюсер приложения: состояние, действия, выбор экрана |
| `src/state/AppContext.tsx` | Провайдер состояния и диспетчера |
| `src/hooks/usePersistence.ts` | Восстановление состояния при запуске и запись при изменениях |
| `src/hooks/useSwipeGesture.ts` | Перетаскивание, клавиатура, переворот карточки |
| `src/components/Card.tsx` | Отрисовка карточки и её анимаций |
| `src/components/SimpleProgress.tsx` | Полоса прогресса круга |
| `src/components/RingProgress.tsx` | Сегменты блоков в режиме колец |
| `src/components/Counters.tsx` | Счётчики «знаю» и «не знаю» |
| `src/components/UpdatePrompt.tsx` | Уведомление о новой версии приложения |
| `src/screens/ImportScreen.tsx` | Ввод таблицы, выбор колонок, превью |
| `src/screens/ModeScreen.tsx` | Выбор направления и режима |
| `src/screens/TrainingScreen.tsx` | Экран тренировки |
| `src/screens/ResumeScreen.tsx` | Продолжить или начать заново |
| `src/screens/DoneScreen.tsx` | Итоги сессии |
| `src/App.tsx` | Выбор экрана по состоянию |
| `src/styles/tokens.css` | Цвета, типографика, размеры |

Тесты лежат рядом с модулем: `src/core/pinyin.test.ts`, `src/screens/ImportScreen.test.tsx` и так далее. Сквозной тест — в `e2e/training.spec.ts`.

---

### Task 1: Подготовка репозитория

Прототип живёт в неслитой ветке внутри `.worktrees/`. Пока это так, работать не с чего: любая уборка worktree уничтожит единственную рабочую версию. Папку заодно переименовываем — кириллица и пробелы в пути ломают инструменты сборки, а название больше не отражает содержимое.

**Files:**
- Перемещение: `Карточки для русского/` → `hanzi-cards/`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: ничего
- Produces: ветку `master` с кодом прототипа и спеком; рабочую папку `~/Documents/Projects/hanzi-cards`

> **Внимание.** Шаги 2 и 4 меняют путь рабочей директории. После шага 4 текущую сессию нужно перезапустить в новой папке — старый путь перестанет существовать.

- [ ] **Step 1: Влить ветку прототипа в master**

```bash
cd "$HOME/Documents/Projects/Карточки для русского"
git checkout master
git merge --no-ff flashcards-implementation -m "Merge the flashcards prototype and the Stage 0 spec

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git log --oneline -3
```

Ожидается: в `master` появились `index.html`, `deck.js`, `main.js`, `deck.test.js`, оба документа в `docs/superpowers/`.

- [ ] **Step 2: Удалить worktree**

```bash
cd "$HOME/Documents/Projects/Карточки для русского"
git worktree remove .worktrees/flashcards-implementation
git worktree list
```

Ожидается: в списке остался только основной checkout. Если `git worktree remove` жалуется на незакоммиченные изменения, это `.DS_Store` — удалите их и повторите.

- [ ] **Step 3: Поставить тег на прототип**

```bash
cd "$HOME/Documents/Projects/Карточки для русского"
git tag -a prototype -m "Vanilla JS prototype before the Stage 0 rework"
git tag
```

Тег нужен, чтобы после удаления `main.js` и `deck.js` в Task 19 к рабочему прототипу можно было вернуться одной командой.

- [ ] **Step 4: Переименовать папку**

```bash
cd "$HOME/Documents/Projects"
mv "Карточки для русского" hanzi-cards
cd hanzi-cards
git status
```

Ожидается: `git status` работает, ветка `master`, дерево чистое кроме `.DS_Store`.

- [ ] **Step 5: Дополнить .gitignore**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > .gitignore <<'EOF'
.worktrees/
.DS_Store
node_modules/
dist/
dev-dist/
coverage/
test-results/
playwright-report/
.vite/
*.local
EOF
```

- [ ] **Step 6: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add .gitignore
git commit -m "chore: extend gitignore for the Vite toolchain

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Скелет проекта

Собираем конфигурацию руками, а не через `npm create vite`: генератор отказывается работать в непустой папке, а так каждый файл виден в плане и проверяем на ревью. Задача считается сделанной, когда `lint`, `typecheck`, `test` и `build` проходят на одном тривиальном тесте.

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/App.test.tsx`
- Delete: старый `index.html` заменяется целиком

**Interfaces:**
- Consumes: ничего
- Produces: команды `npm run dev | build | typecheck | lint | test`; алиас `@` на `src`

- [ ] **Step 1: Создать package.json**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
rm -f index.html
cat > package.json <<'EOF'
{
  "name": "hanzi-cards",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port 4173",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
EOF
```

- [ ] **Step 2: Установить зависимости**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm install react react-dom
npm install -D typescript vite @vitejs/plugin-react \
  vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals \
  prettier @types/react @types/react-dom
node -v
```

Ожидается: Node 20 или новее, `node_modules` создан, ошибок нет.

- [ ] **Step 3: Создать tsconfig.json и tsconfig.node.json**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "e2e"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
cat > tsconfig.node.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "playwright.config.ts", "scripts"]
}
EOF
npm install -D @types/node
```

`noUncheckedIndexedAccess` включён намеренно: очереди сессии — массивы, и он заставляет обрабатывать пустую очередь явно, а не полагаться на `undefined`.

- [ ] **Step 4: Создать vite.config.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > vite.config.ts <<'EOF'
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Пуст везде, кроме публикации: DEPLOY_BASE выставляет только job деплоя.
  base: process.env.DEPLOY_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
EOF
```

GitHub Pages отдаёт сайт по пути `/<имя-репозитория>/`, а dev-сервер и `vite preview` — по корню, поэтому `base` берётся из переменной `DEPLOY_BASE`, которую выставляет только job публикации. Привязывать `base` к самому факту запуска в CI нельзя: сквозные тесты там тоже собирают приложение, и они ходят по корню.

- [ ] **Step 5: Создать конфигурацию ESLint и Prettier**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > eslint.config.js <<'EOF'
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/**/*.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/core must not touch the DOM' },
        { name: 'document', message: 'src/core must not touch the DOM' },
        { name: 'localStorage', message: 'pass a StorageLike parameter instead' },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'react/*', '@/components/*', '@/screens/*', '@/hooks/*', '@/state/*'] },
      ],
    },
  },
);
EOF
cat > .prettierrc <<'EOF'
{
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all"
}
EOF
```

Правила для `src/core/**` — это не косметика, а машинная проверка девятого критерия готовности из спека. Граница слоёв, за которой никто не следит, разрушается за пару недель.

- [ ] **Step 6: Создать точку входа**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
mkdir -p src/test src/styles
cat > index.html <<'EOF'
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Карточки 汉字</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
cat > src/vite-env.d.ts <<'EOF'
/// <reference types="vite/client" />
EOF
cat > src/main.tsx <<'EOF'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/styles/tokens.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root container #root not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
EOF
cat > src/App.tsx <<'EOF'
export default function App() {
  return <h1>Карточки 汉字</h1>;
}
EOF
cat > src/styles/tokens.css <<'EOF'
:root {
  color-scheme: dark;
}
EOF
cat > src/test/setup.ts <<'EOF'
import '@testing-library/jest-dom/vitest';
EOF
```

- [ ] **Step 7: Написать дымовой тест**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/App.test.tsx <<'EOF'
import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('App', () => {
  it('отрисовывает заголовок', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Карточки 汉字' })).toBeInTheDocument();
  });
});
EOF
```

- [ ] **Step 8: Прогнать всю цепочку проверок**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run lint && npm run typecheck && npm run test && npm run build
```

Ожидается: ESLint без ошибок, `tsc` без ошибок, `1 passed`, `dist/` собран.

- [ ] **Step 9: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add -A
git commit -m "build: scaffold the React + TypeScript + Vite project

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Типы карточки и стороны

Содержимое сторон карточки — чистое отображение данных на направление, поэтому живёт в `core` и проверяется тестами, а не прячется внутри React-компонента.

**Files:**
- Create: `src/core/id.ts`, `src/core/deck.ts`, `src/core/deck.test.ts`

**Interfaces:**
- Consumes: ничего
- Produces:
  - `type Card = { id: string; hanzi: string; pinyin: string; translation: string }`
  - `type Direction = 'hanzi-to-translation' | 'translation-to-hanzi' | 'hanzi-to-pinyin'`
  - `type CardFace = { main: string; mainIsHanzi: boolean; secondary: string; tertiary: string }`
  - `const BLOCK_SIZE = 7`
  - `newId(): string`
  - `splitIntoBlocks<T>(items: readonly T[], blockSize?: number): T[][]`
  - `hasPinyin(cards: readonly Card[]): boolean`
  - `DIRECTIONS: readonly Direction[]`, `DIRECTION_LABELS: Record<Direction, string>`
  - `frontFace(card: Card, direction: Direction): CardFace`
  - `backFace(card: Card, direction: Direction): CardFace`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
mkdir -p src/core
cat > src/core/deck.test.ts <<'EOF'
import { BLOCK_SIZE, backFace, frontFace, hasPinyin, splitIntoBlocks } from '@/core/deck';
import type { Card } from '@/core/deck';
import { newId } from '@/core/id';

const card: Card = { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' };
const noPinyin: Card = { id: 'c2', hanzi: '谢谢', pinyin: '', translation: 'спасибо' };

describe('newId', () => {
  it('выдаёт непустые и различные идентификаторы', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()));
    expect(ids.size).toBe(100);
    expect([...ids].every((id) => id.length > 0)).toBe(true);
  });
});

describe('splitIntoBlocks', () => {
  it('режет по семь и оставляет короткий последний блок', () => {
    const items = Array.from({ length: 8 }, (_, i) => i);
    expect(splitIntoBlocks(items, BLOCK_SIZE)).toEqual([[0, 1, 2, 3, 4, 5, 6], [7]]);
  });

  it('на пустом входе даёт пустой список блоков', () => {
    expect(splitIntoBlocks([], BLOCK_SIZE)).toEqual([]);
  });

  it('по умолчанию использует BLOCK_SIZE', () => {
    expect(splitIntoBlocks(Array.from({ length: 7 }, (_, i) => i))).toHaveLength(1);
  });
});

describe('hasPinyin', () => {
  it('истина, если хотя бы у одной карточки есть пиньинь', () => {
    expect(hasPinyin([noPinyin, card])).toBe(true);
  });

  it('ложь, если пиньиня нет ни у одной', () => {
    expect(hasPinyin([noPinyin, { ...noPinyin, pinyin: '   ' }])).toBe(false);
  });

  it('ложь на пустой колоде', () => {
    expect(hasPinyin([])).toBe(false);
  });
});

describe('frontFace и backFace', () => {
  it('иероглиф → перевод', () => {
    expect(frontFace(card, 'hanzi-to-translation')).toEqual({
      main: '你好', mainIsHanzi: true, secondary: '', tertiary: '',
    });
    expect(backFace(card, 'hanzi-to-translation')).toEqual({
      main: 'привет', mainIsHanzi: false, secondary: 'nǐ hǎo', tertiary: '',
    });
  });

  it('перевод → иероглиф', () => {
    expect(frontFace(card, 'translation-to-hanzi')).toEqual({
      main: 'привет', mainIsHanzi: false, secondary: '', tertiary: '',
    });
    expect(backFace(card, 'translation-to-hanzi')).toEqual({
      main: '你好', mainIsHanzi: true, secondary: 'nǐ hǎo', tertiary: '',
    });
  });

  it('иероглиф → пиньинь: перевод уходит в мелкую строку', () => {
    expect(backFace(card, 'hanzi-to-pinyin')).toEqual({
      main: 'nǐ hǎo', mainIsHanzi: false, secondary: '', tertiary: 'привет',
    });
  });

  it('пустой пиньинь не попадает на обратную сторону', () => {
    expect(backFace(noPinyin, 'hanzi-to-translation').secondary).toBe('');
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/deck.test.ts
```

Ожидается: FAIL, «Failed to resolve import "@/core/deck"».

- [ ] **Step 3: Реализовать id.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/id.ts <<'EOF'
let counter = 0;

/**
 * Идентификатор карточки. `crypto.randomUUID` доступен во всех целевых браузерах
 * и в Node 20, запасной вариант нужен только для нестандартных окружений.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  counter += 1;
  return `card-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 10)}`;
}
EOF
```

- [ ] **Step 4: Реализовать deck.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/deck.ts <<'EOF'
export type Card = {
  id: string;
  hanzi: string;
  pinyin: string;
  translation: string;
};

export type Direction = 'hanzi-to-translation' | 'translation-to-hanzi' | 'hanzi-to-pinyin';

export const DIRECTIONS: readonly Direction[] = [
  'hanzi-to-translation',
  'translation-to-hanzi',
  'hanzi-to-pinyin',
];

export const DIRECTION_LABELS: Record<Direction, string> = {
  'hanzi-to-translation': 'Иероглиф → перевод',
  'translation-to-hanzi': 'Перевод → иероглиф',
  'hanzi-to-pinyin': 'Иероглиф → пиньинь',
};

/** Что показывает одна сторона карточки. Пустая строка означает «не показывать». */
export type CardFace = {
  main: string;
  mainIsHanzi: boolean;
  secondary: string;
  tertiary: string;
};

export const BLOCK_SIZE = 7;

export function splitIntoBlocks<T>(items: readonly T[], blockSize: number = BLOCK_SIZE): T[][] {
  const blocks: T[][] = [];
  for (let i = 0; i < items.length; i += blockSize) {
    blocks.push(items.slice(i, i + blockSize));
  }
  return blocks;
}

export function hasPinyin(cards: readonly Card[]): boolean {
  return cards.some((card) => card.pinyin.trim() !== '');
}

export function frontFace(card: Card, direction: Direction): CardFace {
  if (direction === 'translation-to-hanzi') {
    return { main: card.translation, mainIsHanzi: false, secondary: '', tertiary: '' };
  }
  return { main: card.hanzi, mainIsHanzi: true, secondary: '', tertiary: '' };
}

export function backFace(card: Card, direction: Direction): CardFace {
  switch (direction) {
    case 'hanzi-to-translation':
      return { main: card.translation, mainIsHanzi: false, secondary: card.pinyin, tertiary: '' };
    case 'translation-to-hanzi':
      return { main: card.hanzi, mainIsHanzi: true, secondary: card.pinyin, tertiary: '' };
    case 'hanzi-to-pinyin':
      return { main: card.pinyin, mainIsHanzi: false, secondary: '', tertiary: card.translation };
  }
}
EOF
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/deck.test.ts && npm run lint && npm run typecheck
```

Ожидается: все тесты зелёные, lint и typecheck чисто.

- [ ] **Step 6: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/core/id.ts src/core/deck.ts src/core/deck.test.ts
git commit -m "feat: add card types, block splitting and card faces

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Нормализация пиньиня

**Files:**
- Create: `src/core/pinyin.ts`, `src/core/pinyin.test.ts`

**Interfaces:**
- Consumes: ничего
- Produces: `normalizePinyin(input: string): string`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/pinyin.test.ts <<'EOF'
import { normalizePinyin } from '@/core/pinyin';

describe('normalizePinyin', () => {
  it('ставит знаки тона вместо цифр', () => {
    expect(normalizePinyin('ni3 hao3')).toBe('nǐ hǎo');
  });

  it('превращает v в ü', () => {
    expect(normalizePinyin('lv4')).toBe('lǜ');
  });

  it('превращает u: в ü', () => {
    expect(normalizePinyin('nu:3')).toBe('nǚ');
  });

  it('нейтральный тон убирает цифру без знака', () => {
    expect(normalizePinyin('ma5')).toBe('ma');
    expect(normalizePinyin('ma0')).toBe('ma');
  });

  it('разбирает слитно записанные слоги', () => {
    expect(normalizePinyin('xie4xie5')).toBe('xièxie');
  });

  it('не трогает уже готовый пиньинь', () => {
    expect(normalizePinyin('nǐ hǎo')).toBe('nǐ hǎo');
  });

  it('сохраняет регистр', () => {
    expect(normalizePinyin('Ni3')).toBe('Nǐ');
    expect(normalizePinyin('Zhong1guo2')).toBe('Zhōngguó');
  });

  it('выбирает гласную по стандартному правилу', () => {
    expect(normalizePinyin('hao3')).toBe('hǎo');
    expect(normalizePinyin('gei3')).toBe('gěi');
    expect(normalizePinyin('dou1')).toBe('dōu');
    expect(normalizePinyin('liu4')).toBe('liù');
    expect(normalizePinyin('hui2')).toBe('huí');
  });

  it('не трогает латиницу без цифры тона', () => {
    expect(normalizePinyin('very good')).toBe('very good');
  });

  it('пустая строка остаётся пустой', () => {
    expect(normalizePinyin('')).toBe('');
  });
});
EOF
```

Последний важный случай — `very good`. Замена `v` на `ü` происходит только внутри слога с цифрой тона, иначе автоопределение колонок, ошибочно принявшее английский перевод за пиньинь, превращало бы его в кашу.

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/pinyin.test.ts
```

Ожидается: FAIL, «Failed to resolve import "@/core/pinyin"».

- [ ] **Step 3: Реализовать pinyin.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/pinyin.ts <<'EOF'
const TONE_MARKS: Record<string, readonly string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

const VOWELS = 'aeiouü';
const SYLLABLE_WITH_TONE = /([a-zA-ZüÜ]+)([0-5])/g;

/**
 * Приводит пиньинь к записи с диакритикой. Слоги без цифры тона не меняются,
 * поэтому уже готовый пиньинь проходит функцию насквозь.
 */
export function normalizePinyin(input: string): string {
  const prepared = input.replace(/u:/g, 'ü').replace(/U:/g, 'Ü');

  return prepared.replace(SYLLABLE_WITH_TONE, (_match, letters: string, digit: string) => {
    const syllable = letters.replace(/v/g, 'ü').replace(/V/g, 'Ü');
    const tone = Number(digit);
    // 0 и 5 — нейтральный тон: цифра уходит, знак не ставится.
    if (tone === 0 || tone === 5) return syllable;
    return applyTone(syllable, tone);
  });
}

function applyTone(syllable: string, tone: number): string {
  const index = toneVowelIndex(syllable);
  if (index === -1) return syllable;

  const vowel = syllable[index];
  if (vowel === undefined) return syllable;

  const marks = TONE_MARKS[vowel.toLowerCase()];
  const marked = marks?.[tone - 1];
  if (marked === undefined) return syllable;

  const isUpperCase = vowel !== vowel.toLowerCase();
  return syllable.slice(0, index) + (isUpperCase ? marked.toUpperCase() : marked) + syllable.slice(index + 1);
}

/** Стандартное правило: a, иначе e, иначе o в сочетании ou, иначе последняя гласная. */
function toneVowelIndex(syllable: string): number {
  const lower = syllable.toLowerCase();

  const a = lower.indexOf('a');
  if (a !== -1) return a;

  const e = lower.indexOf('e');
  if (e !== -1) return e;

  const ou = lower.indexOf('ou');
  if (ou !== -1) return ou;

  for (let i = lower.length - 1; i >= 0; i -= 1) {
    const char = lower[i];
    if (char !== undefined && VOWELS.includes(char)) return i;
  }
  return -1;
}
EOF
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/pinyin.test.ts && npm run lint && npm run typecheck
```

Ожидается: 10 тестов зелёные.

- [ ] **Step 5: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/core/pinyin.ts src/core/pinyin.test.ts
git commit -m "feat: convert numbered pinyin to diacritics

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Разбор таблицы

**Files:**
- Create: `src/core/parse.ts`, `src/core/parse.test.ts`

**Interfaces:**
- Consumes: `newId` из `@/core/id`, `normalizePinyin` из `@/core/pinyin`, `Card` из `@/core/deck`
- Produces:
  - `type ColumnMode = 'auto' | 'three' | 'two'`
  - `type ParseResult = { cards: Card[]; addedCount: number; skippedCount: number }`
  - `parseTable(text: string, columnMode?: ColumnMode): ParseResult`
  - `detectDelimiter(line: string): string`
  - `looksLikePinyin(value: string): boolean`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/parse.test.ts <<'EOF'
import { detectDelimiter, looksLikePinyin, parseTable } from '@/core/parse';

describe('detectDelimiter', () => {
  it('табуляция важнее запятой', () => {
    expect(detectDelimiter('你好\tnǐ hǎo\tпривет, здравствуйте')).toBe('\t');
  });

  it('точка с запятой важнее запятой', () => {
    expect(detectDelimiter('你好;привет, здравствуйте')).toBe(';');
  });

  it('по умолчанию запятая', () => {
    expect(detectDelimiter('你好,привет')).toBe(',');
  });
});

describe('looksLikePinyin', () => {
  it('латиница с тоновыми знаками и цифрами — пиньинь', () => {
    expect(looksLikePinyin('nǐ hǎo')).toBe(true);
    expect(looksLikePinyin('ni3 hao3')).toBe(true);
    expect(looksLikePinyin("xi'an")).toBe(true);
  });

  it('кириллица и иероглифы — не пиньинь', () => {
    expect(looksLikePinyin('привет')).toBe(false);
    expect(looksLikePinyin('你好')).toBe(false);
  });

  it('пустая строка — не пиньинь', () => {
    expect(looksLikePinyin('  ')).toBe(false);
  });
});

describe('parseTable: три колонки', () => {
  it('разбирает табуляцию с пиньинем', () => {
    const result = parseTable('你好\tni3 hao3\tпривет');
    expect(result.addedCount).toBe(1);
    expect(result.cards[0]).toMatchObject({ hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' });
  });

  it('присваивает каждой карточке идентификатор', () => {
    const result = parseTable('你好\tni3 hao3\tпривет\n谢谢\txie4xie5\tспасибо');
    const ids = result.cards.map((card) => card.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });
});

describe('parseTable: две колонки', () => {
  it('оставляет пиньинь пустым', () => {
    const result = parseTable('你好,привет');
    expect(result.cards[0]).toMatchObject({ hanzi: '你好', pinyin: '', translation: 'привет' });
  });
});

describe('parseTable: автоопределение колонок', () => {
  it('кириллица во второй колонке означает перевод с запятой внутри', () => {
    const result = parseTable('你好,привет, здравствуйте');
    expect(result.addedCount).toBe(1);
    expect(result.cards[0]).toMatchObject({
      hanzi: '你好', pinyin: '', translation: 'привет, здравствуйте',
    });
  });

  it('решает построчно: строка с пиньинем и строка без него в одной таблице', () => {
    const result = parseTable('你好,ni3 hao3,привет\n谢谢,спасибо');
    expect(result.cards[0]).toMatchObject({ pinyin: 'nǐ hǎo', translation: 'привет' });
    expect(result.cards[1]).toMatchObject({ pinyin: '', translation: 'спасибо' });
  });

  it('режим two запрещает считать вторую колонку пиньинем', () => {
    const result = parseTable('你好,ni3 hao3,привет', 'two');
    expect(result.cards[0]).toMatchObject({ pinyin: '', translation: 'ni3 hao3, привет' });
  });

  it('режим three заставляет считать вторую колонку пиньинем', () => {
    const result = parseTable('你好,hello,greeting', 'three');
    expect(result.cards[0]).toMatchObject({ pinyin: 'hello', translation: 'greeting' });
  });
});

describe('parseTable: заголовок', () => {
  it('пропускает строку заголовка', () => {
    const result = parseTable('иероглиф,пиньинь,перевод\n你好,ni3 hao3,привет');
    expect(result.addedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
  });

  it('распознаёт английский заголовок из двух колонок', () => {
    const result = parseTable('Hanzi,Translation\n你好,привет');
    expect(result.addedCount).toBe(1);
  });

  it('не принимает за заголовок обычную строку', () => {
    const result = parseTable('你好,привет\n谢谢,спасибо');
    expect(result.addedCount).toBe(2);
  });
});

describe('parseTable: пропуск строк', () => {
  it('пустые строки не попадают в счётчик пропущенных', () => {
    const result = parseTable('你好,привет\n\n谢谢,спасибо\n');
    expect(result.addedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
  });

  it('строку из одной колонки считает пропущенной', () => {
    const result = parseTable('你好,привет\nмусор');
    expect(result.addedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });

  it('пропускает строку с пустым иероглифом или пустым переводом', () => {
    const result = parseTable(',привет\n你好,');
    expect(result.addedCount).toBe(0);
    expect(result.skippedCount).toBe(2);
  });

  it('пустой ввод даёт пустой результат', () => {
    expect(parseTable('   ')).toEqual({ cards: [], addedCount: 0, skippedCount: 0 });
  });
});

describe('parseTable: склейка лишних колонок', () => {
  it('склеивает хвост через табуляцию пробелом', () => {
    const result = parseTable('你好\tni3 hao3\tпривет\tздравствуйте');
    expect(result.cards[0]?.translation).toBe('привет здравствуйте');
  });

  it('склеивает хвост через запятую запятой с пробелом', () => {
    const result = parseTable('你好,ni3 hao3,привет,здравствуйте');
    expect(result.cards[0]?.translation).toBe('привет, здравствуйте');
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/parse.test.ts
```

Ожидается: FAIL, «Failed to resolve import "@/core/parse"».

- [ ] **Step 3: Реализовать parse.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/parse.ts <<'EOF'
import type { Card } from '@/core/deck';
import { newId } from '@/core/id';
import { normalizePinyin } from '@/core/pinyin';

export type ColumnMode = 'auto' | 'three' | 'two';

export type ParseResult = {
  cards: Card[];
  addedCount: number;
  skippedCount: number;
};

const HEADER_FIRST = /^(иероглиф|汉字|hanzi|слово|word|term)$/i;
const HEADER_LAST = /^(перевод|translation|значение|meaning)$/i;

/** Латиница, ü, гласные с тонами, пробелы, апострофы, дефисы, двоеточия и цифры 0–5. */
const PINYIN_ONLY = /^[a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s'\-:0-5]+$/;

export function detectDelimiter(line: string): string {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  return ',';
}

export function looksLikePinyin(value: string): boolean {
  return value.trim() !== '' && PINYIN_ONLY.test(value);
}

export function parseTable(text: string, columnMode: ColumnMode = 'auto'): ParseResult {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const firstNonEmpty = lines.find((line) => line.trim() !== '');
  if (firstNonEmpty === undefined) {
    return { cards: [], addedCount: 0, skippedCount: 0 };
  }

  const delimiter = detectDelimiter(firstNonEmpty);
  const body = lines.slice();

  const headerCells = splitLine(firstNonEmpty, delimiter);
  const firstCell = headerCells[0];
  const lastCell = headerCells[headerCells.length - 1];
  const isHeader =
    headerCells.length >= 2 &&
    firstCell !== undefined &&
    lastCell !== undefined &&
    HEADER_FIRST.test(firstCell) &&
    HEADER_LAST.test(lastCell);
  if (isHeader) {
    body.splice(body.indexOf(firstNonEmpty), 1);
  }

  const cards: Card[] = [];
  let skippedCount = 0;

  for (const line of body) {
    // Пустые строки не считаются пропущенными: завершающий перевод строки есть
    // почти в любой скопированной таблице и давал бы вечное «пропущено 1».
    if (line.trim() === '') continue;

    const card = buildCard(splitLine(line, delimiter), delimiter, columnMode);
    if (card === null) {
      skippedCount += 1;
      continue;
    }
    cards.push(card);
  }

  return { cards, addedCount: cards.length, skippedCount };
}

function splitLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((cell) => cell.trim());
}

function joinRest(cells: string[], delimiter: string): string {
  const separator = delimiter === '\t' ? ' ' : `${delimiter} `;
  return cells
    .filter((cell) => cell !== '')
    .join(separator)
    .trim();
}

function buildCard(cells: string[], delimiter: string, columnMode: ColumnMode): Card | null {
  if (cells.length < 2) return null;

  const hanzi = cells[0] ?? '';
  const second = cells[1] ?? '';

  const secondIsPinyin =
    cells.length >= 3 &&
    (columnMode === 'three' || (columnMode === 'auto' && looksLikePinyin(second)));

  const pinyin = secondIsPinyin ? normalizePinyin(second) : '';
  const translation = joinRest(cells.slice(secondIsPinyin ? 2 : 1), delimiter);

  if (hanzi === '' || translation === '') return null;
  return { id: newId(), hanzi, pinyin, translation };
}
EOF
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/parse.test.ts && npm run lint && npm run typecheck
```

Ожидается: все тесты зелёные.

- [ ] **Step 5: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/core/parse.ts src/core/parse.test.ts
git commit -m "feat: parse pasted tables into hanzi cards

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Машина состояний тренировки

Правила переносятся из прототипа без изменений. Отличий два: очереди хранят идентификаторы вместо объектов карточек, и у простой сессии появляется признак `finalRound` — сводного круга после колец.

**Files:**
- Create: `src/core/session.ts`, `src/core/session.test.ts`

**Interfaces:**
- Consumes: `BLOCK_SIZE`, `splitIntoBlocks` из `@/core/deck`
- Produces:
  - `type SwipeDirection = 'left' | 'right'`
  - `type SessionMode = 'simple' | 'ring'`
  - `type SimpleSession = { mode: 'simple'; round: number; queue: string[]; nextRound: string[]; perfectRound: boolean; finalRound: boolean; finished: boolean }`
  - `type RingSession = { mode: 'ring'; blocks: string[][]; blockIndex: number; queue: string[]; finished: boolean }`
  - `type Session = SimpleSession | RingSession`
  - `createSession(cardIds: readonly string[], mode: SessionMode): Session`
  - `swipe(session: Session, direction: SwipeDirection): Session`
  - `currentCardId(session: Session): string | null`
  - `roundProgress(session: SimpleSession): { done: number; total: number }`
  - `ringProgress(session: RingSession): { blockIndex: number; blockCount: number; remaining: number }`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/session.test.ts <<'EOF'
import {
  createSession,
  currentCardId,
  ringProgress,
  roundProgress,
  swipe,
} from '@/core/session';
import type { RingSession, SimpleSession, Session, SwipeDirection } from '@/core/session';

const ids = (count: number) => Array.from({ length: count }, (_, i) => `c${i + 1}`);

function swipeAll(session: Session, direction: SwipeDirection, times: number): Session {
  let current = session;
  for (let i = 0; i < times; i += 1) current = swipe(current, direction);
  return current;
}

describe('простой режим', () => {
  it('стартует с первой карточки первого круга', () => {
    const session = createSession(ids(3), 'simple') as SimpleSession;
    expect(session.mode).toBe('simple');
    expect(session.round).toBe(1);
    expect(currentCardId(session)).toBe('c1');
    expect(session.finished).toBe(false);
  });

  it('свайп вправо убирает карточку из круга', () => {
    const session = swipe(createSession(ids(3), 'simple'), 'right') as SimpleSession;
    expect(currentCardId(session)).toBe('c2');
    expect(session.nextRound).toEqual(['c1']);
    expect(session.perfectRound).toBe(true);
  });

  it('свайп влево возвращает карточку в конец очереди и портит круг', () => {
    const session = swipe(createSession(ids(3), 'simple'), 'left') as SimpleSession;
    expect(session.queue).toEqual(['c2', 'c3', 'c1']);
    expect(session.perfectRound).toBe(false);
  });

  it('идеальный круг завершает сессию', () => {
    const session = swipeAll(createSession(ids(3), 'simple'), 'right', 3) as SimpleSession;
    expect(session.finished).toBe(true);
    expect(currentCardId(session)).toBeNull();
  });

  it('после круга с ошибкой начинается следующий круг', () => {
    let session = swipe(createSession(ids(2), 'simple'), 'left');
    session = swipe(session, 'right'); // c2 вправо
    session = swipe(session, 'right'); // c1 вправо, очередь пуста
    const simple = session as SimpleSession;
    expect(simple.finished).toBe(false);
    expect(simple.round).toBe(2);
    expect(simple.queue).toEqual(['c2', 'c1']);
    expect(simple.perfectRound).toBe(true);
  });

  it('свайп по завершённой сессии ничего не меняет', () => {
    const finished = swipeAll(createSession(ids(1), 'simple'), 'right', 1);
    expect(swipe(finished, 'right')).toBe(finished);
  });

  it('пустая колода сразу завершена', () => {
    expect(createSession([], 'simple').finished).toBe(true);
  });

  it('roundProgress считает пройденные карточки круга', () => {
    const session = swipe(createSession(ids(4), 'simple'), 'right') as SimpleSession;
    expect(roundProgress(session)).toEqual({ done: 1, total: 4 });
  });
});

describe('режим колец', () => {
  it('делит колоду на блоки по семь с коротким последним', () => {
    const session = createSession(ids(8), 'ring') as RingSession;
    expect(session.blocks).toHaveLength(2);
    expect(session.blocks[1]).toEqual(['c8']);
    expect(session.queue).toHaveLength(7);
  });

  it('свайп влево возвращает карточку в конец блока', () => {
    const session = swipe(createSession(ids(8), 'ring'), 'left') as RingSession;
    expect(session.queue[session.queue.length - 1]).toBe('c1');
    expect(session.blockIndex).toBe(0);
  });

  it('пустая очередь блока переводит на следующий блок', () => {
    const session = swipeAll(createSession(ids(8), 'ring'), 'right', 7) as RingSession;
    expect(session.mode).toBe('ring');
    expect(session.blockIndex).toBe(1);
    expect(currentCardId(session)).toBe('c8');
  });

  it('после последнего блока запускается сводный круг', () => {
    const session = swipeAll(createSession(ids(8), 'ring'), 'right', 8) as SimpleSession;
    expect(session.mode).toBe('simple');
    expect(session.finalRound).toBe(true);
    expect(session.finished).toBe(false);
    expect(session.queue).toHaveLength(8);
    expect(currentCardId(session)).toBe('c1');
  });

  it('сводный круг завершает тренировку', () => {
    const afterRings = swipeAll(createSession(ids(8), 'ring'), 'right', 8);
    expect(swipeAll(afterRings, 'right', 8).finished).toBe(true);
  });

  it('ringProgress отдаёт номер блока и остаток', () => {
    const session = createSession(ids(8), 'ring') as RingSession;
    expect(ringProgress(session)).toEqual({ blockIndex: 0, blockCount: 2, remaining: 7 });
  });

  it('пустая колода сразу завершена', () => {
    expect(createSession([], 'ring').finished).toBe(true);
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/session.test.ts
```

Ожидается: FAIL, «Failed to resolve import "@/core/session"».

- [ ] **Step 3: Реализовать session.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/session.ts <<'EOF'
import { BLOCK_SIZE, splitIntoBlocks } from '@/core/deck';

export type SwipeDirection = 'left' | 'right';
export type SessionMode = 'simple' | 'ring';

export type SimpleSession = {
  mode: 'simple';
  round: number;
  queue: string[];
  nextRound: string[];
  perfectRound: boolean;
  /** true, если это сводный круг после прохождения всех колец. */
  finalRound: boolean;
  finished: boolean;
};

export type RingSession = {
  mode: 'ring';
  blocks: string[][];
  blockIndex: number;
  queue: string[];
  finished: boolean;
};

export type Session = SimpleSession | RingSession;

export function createSimpleSession(cardIds: readonly string[], finalRound = false): SimpleSession {
  return {
    mode: 'simple',
    round: 1,
    queue: [...cardIds],
    nextRound: [],
    perfectRound: true,
    finalRound,
    finished: cardIds.length === 0,
  };
}

export function createRingSession(cardIds: readonly string[]): RingSession {
  const blocks = splitIntoBlocks(cardIds, BLOCK_SIZE);
  return {
    mode: 'ring',
    blocks,
    blockIndex: 0,
    queue: [...(blocks[0] ?? [])],
    finished: blocks.length === 0,
  };
}

export function createSession(cardIds: readonly string[], mode: SessionMode): Session {
  return mode === 'ring' ? createRingSession(cardIds) : createSimpleSession(cardIds);
}

export function currentCardId(session: Session): string | null {
  if (session.finished) return null;
  return session.queue[0] ?? null;
}

export function swipe(session: Session, direction: SwipeDirection): Session {
  if (session.finished) return session;
  return session.mode === 'ring' ? swipeRing(session, direction) : swipeSimple(session, direction);
}

function swipeSimple(session: SimpleSession, direction: SwipeDirection): SimpleSession {
  const current = session.queue[0];
  if (current === undefined) return session;

  const queue = session.queue.slice(1);
  const nextRound = [...session.nextRound];
  let perfectRound = session.perfectRound;

  if (direction === 'right') {
    nextRound.push(current);
  } else {
    queue.push(current);
    perfectRound = false;
  }

  if (queue.length > 0) {
    return { ...session, queue, nextRound, perfectRound };
  }

  // Очередь опустела — значит каждая карточка хотя бы раз ушла вправо.
  if (perfectRound) {
    return { ...session, queue: [], nextRound: [], perfectRound: true, finished: true };
  }
  return {
    ...session,
    round: session.round + 1,
    queue: nextRound,
    nextRound: [],
    perfectRound: true,
  };
}

function swipeRing(session: RingSession, direction: SwipeDirection): Session {
  const current = session.queue[0];
  if (current === undefined) return session;

  const queue = session.queue.slice(1);
  if (direction === 'left') {
    queue.push(current);
  }

  if (queue.length > 0) {
    return { ...session, queue };
  }

  const nextBlockIndex = session.blockIndex + 1;
  const nextBlock = session.blocks[nextBlockIndex];
  if (nextBlock !== undefined) {
    return { ...session, blockIndex: nextBlockIndex, queue: [...nextBlock] };
  }

  // Блоки кончились — сводный круг по всей колоде по правилам простого режима.
  return createSimpleSession(session.blocks.flat(), true);
}

export function roundProgress(session: SimpleSession): { done: number; total: number } {
  return {
    done: session.nextRound.length,
    total: session.queue.length + session.nextRound.length,
  };
}

export function ringProgress(session: RingSession): {
  blockIndex: number;
  blockCount: number;
  remaining: number;
} {
  return {
    blockIndex: session.blockIndex,
    blockCount: session.blocks.length,
    remaining: session.queue.length,
  };
}
EOF
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/session.test.ts && npm run lint && npm run typecheck
```

Ожидается: все тесты зелёные.

- [ ] **Step 5: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/core/session.ts src/core/session.test.ts
git commit -m "feat: port the training state machine to TypeScript

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Хранилище

Модуль не обращается к `localStorage` напрямую — хранилище приходит параметром типа `StorageLike`. Это и держит границу слоёв, и делает тесты тривиальными, и оставляет дверь открытой для серверного хранилища на Этапе 4.

**Files:**
- Create: `src/core/storage.ts`, `src/core/storage.test.ts`

**Interfaces:**
- Consumes: `Card`, `Direction` из `@/core/deck`; `Session` из `@/core/session`
- Produces:
  - `const STORAGE_KEY = 'flashcards.v2'`, `const STORAGE_VERSION = 2`
  - `type Stats = { known: number; unknown: number }`
  - `type StoredState = { version: 2; cards: Card[]; direction: Direction; session: Session | null; stats: Stats }`
  - `type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void }`
  - `loadState(storage: StorageLike): StoredState | null`
  - `saveState(storage: StorageLike, state: StoredState): boolean`
  - `deserialize(raw: string | null): StoredState | null`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/storage.test.ts <<'EOF'
import { STORAGE_KEY, STORAGE_VERSION, deserialize, loadState, saveState } from '@/core/storage';
import type { StorageLike, StoredState } from '@/core/storage';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const valid: StoredState = {
  version: STORAGE_VERSION,
  cards: [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' }],
  direction: 'hanzi-to-translation',
  session: {
    mode: 'simple',
    round: 1,
    queue: ['c1'],
    nextRound: [],
    perfectRound: true,
    finalRound: false,
    finished: false,
  },
  stats: { known: 0, unknown: 0 },
};

describe('saveState и loadState', () => {
  it('сохраняет и читает состояние без потерь', () => {
    const storage = memoryStorage();
    expect(saveState(storage, valid)).toBe(true);
    expect(loadState(storage)).toEqual(valid);
  });

  it('пишет ровно по ключу flashcards.v2', () => {
    const storage = memoryStorage();
    saveState(storage, valid);
    expect(Object.keys(storage.data)).toEqual([STORAGE_KEY]);
  });

  it('сохраняет сессию колец', () => {
    const storage = memoryStorage();
    const ringState: StoredState = {
      ...valid,
      session: { mode: 'ring', blocks: [['c1']], blockIndex: 0, queue: ['c1'], finished: false },
    };
    saveState(storage, ringState);
    expect(loadState(storage)).toEqual(ringState);
  });

  it('возвращает false, если хранилище отказало', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(saveState(failing, valid)).toBe(false);
  });

  it('не падает, если чтение отказало', () => {
    const failing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    };
    expect(loadState(failing)).toBeNull();
  });
});

describe('deserialize', () => {
  it('на отсутствующем значении даёт null', () => {
    expect(deserialize(null)).toBeNull();
  });

  it('на битом JSON даёт null', () => {
    expect(deserialize('{не json')).toBeNull();
  });

  it('на чужой версии даёт null', () => {
    expect(deserialize(JSON.stringify({ ...valid, version: 1 }))).toBeNull();
  });

  it('на неполной структуре даёт null', () => {
    expect(deserialize(JSON.stringify({ version: STORAGE_VERSION, cards: [] }))).toBeNull();
  });

  it('на неизвестном направлении даёт null', () => {
    expect(deserialize(JSON.stringify({ ...valid, direction: 'hanzi-to-mars' }))).toBeNull();
  });

  it('на карточке без поля даёт null', () => {
    const broken = { ...valid, cards: [{ id: 'c1', hanzi: '你好' }] };
    expect(deserialize(JSON.stringify(broken))).toBeNull();
  });

  it('на сессии с числами вместо идентификаторов даёт null', () => {
    const broken = { ...valid, session: { ...valid.session, queue: [1, 2] } };
    expect(deserialize(JSON.stringify(broken))).toBeNull();
  });

  it('принимает состояние без активной сессии', () => {
    expect(deserialize(JSON.stringify({ ...valid, session: null }))).not.toBeNull();
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/storage.test.ts
```

Ожидается: FAIL, «Failed to resolve import "@/core/storage"».

- [ ] **Step 3: Реализовать storage.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/storage.ts <<'EOF'
import { DIRECTIONS } from '@/core/deck';
import type { Card, Direction } from '@/core/deck';
import type { Session } from '@/core/session';

export const STORAGE_KEY = 'flashcards.v2';
export const STORAGE_VERSION = 2;

export type Stats = { known: number; unknown: number };

export type StoredState = {
  version: typeof STORAGE_VERSION;
  cards: Card[];
  direction: Direction;
  session: Session | null;
  stats: Stats;
};

/** Минимальный контракт хранилища. localStorage ему удовлетворяет. */
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function deserialize(raw: string | null): StoredState | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isStoredState(parsed) ? parsed : null;
}

export function loadState(storage: StorageLike): StoredState | null {
  try {
    return deserialize(storage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Возвращает false, если записать не удалось: приватный режим или переполнение квоты. */
export function saveState(storage: StorageLike, state: StoredState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isCard(value: unknown): value is Card {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.hanzi === 'string' &&
    typeof value.pinyin === 'string' &&
    typeof value.translation === 'string'
  );
}

function isSession(value: unknown): value is Session {
  if (!isRecord(value) || typeof value.finished !== 'boolean') return false;

  if (value.mode === 'simple') {
    return (
      typeof value.round === 'number' &&
      isStringArray(value.queue) &&
      isStringArray(value.nextRound) &&
      typeof value.perfectRound === 'boolean' &&
      typeof value.finalRound === 'boolean'
    );
  }
  if (value.mode === 'ring') {
    return (
      typeof value.blockIndex === 'number' &&
      Array.isArray(value.blocks) &&
      value.blocks.every(isStringArray) &&
      isStringArray(value.queue)
    );
  }
  return false;
}

function isStats(value: unknown): value is Stats {
  return isRecord(value) && typeof value.known === 'number' && typeof value.unknown === 'number';
}

function isStoredState(value: unknown): value is StoredState {
  return (
    isRecord(value) &&
    value.version === STORAGE_VERSION &&
    Array.isArray(value.cards) &&
    value.cards.every(isCard) &&
    typeof value.direction === 'string' &&
    DIRECTIONS.includes(value.direction as Direction) &&
    (value.session === null || isSession(value.session)) &&
    isStats(value.stats)
  );
}
EOF
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/storage.test.ts && npm run lint && npm run typecheck
```

Ожидается: все тесты зелёные.

- [ ] **Step 5: Проверить, что граница слоя держится**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
grep -rn "from 'react'\|window\.\|document\." src/core --include='*.ts' | grep -v '\.test\.ts' || echo "core чист"
npm run lint
```

Ожидается: «core чист», ESLint без ошибок. Это девятый критерий готовности из спека.

- [ ] **Step 6: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/core/storage.ts src/core/storage.test.ts
git commit -m "feat: add versioned state storage with validation

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Редьюсер и контекст

**Files:**
- Create: `src/state/appReducer.ts`, `src/state/appReducer.test.ts`, `src/state/AppContext.tsx`

**Interfaces:**
- Consumes: `Card`, `Direction`, `hasPinyin` из `@/core/deck`; `createSession`, `swipe`, `SessionMode`, `SwipeDirection`, `Session` из `@/core/session`; `Stats`, `StoredState` из `@/core/storage`
- Produces:
  - `type Screen = 'resume' | 'import' | 'mode' | 'training' | 'done'`
  - `type AppState = { cards: Card[]; direction: Direction; session: Session | null; startedMode: SessionMode; stats: Stats; screen: Screen; hydrated: boolean; storageFailed: boolean }`
  - `type AppAction` — объединение действий, перечисленных в реализации
  - `const initialState: AppState`
  - `appReducer(state: AppState, action: AppAction): AppState`
  - `AppProvider` со свойствами `{ children, initial?: AppState }`, `useAppState(): AppState`, `useAppDispatch(): Dispatch<AppAction>`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
mkdir -p src/state
cat > src/state/appReducer.test.ts <<'EOF'
import { appReducer, initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import type { Card } from '@/core/deck';
import { STORAGE_VERSION } from '@/core/storage';
import type { StoredState } from '@/core/storage';
import type { SimpleSession } from '@/core/session';

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];
const cardsWithoutPinyin: Card[] = cards.map((card) => ({ ...card, pinyin: '' }));

function withDeck(): AppState {
  return appReducer({ ...initialState, hydrated: true }, { type: 'deck-imported', cards });
}

describe('deck-imported', () => {
  it('кладёт колоду и ведёт на экран выбора режима', () => {
    const state = withDeck();
    expect(state.cards).toHaveLength(2);
    expect(state.screen).toBe('mode');
    expect(state.session).toBeNull();
  });

  it('сбрасывает счётчики и старую сессию', () => {
    const started = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    const swiped = appReducer(started, { type: 'swiped', direction: 'right' });
    const reimported = appReducer(swiped, { type: 'deck-imported', cards });
    expect(reimported.stats).toEqual({ known: 0, unknown: 0 });
    expect(reimported.session).toBeNull();
  });

  it('уводит с направления на пиньинь, если пиньиня в колоде нет', () => {
    const state = appReducer(
      { ...initialState, hydrated: true, direction: 'hanzi-to-pinyin' },
      { type: 'deck-imported', cards: cardsWithoutPinyin },
    );
    expect(state.direction).toBe('hanzi-to-translation');
  });
});

describe('session-started и swiped', () => {
  it('старт сессии ведёт на тренировку и запоминает режим', () => {
    const state = appReducer(withDeck(), { type: 'session-started', mode: 'ring' });
    expect(state.screen).toBe('training');
    expect(state.startedMode).toBe('ring');
    expect(state.session?.mode).toBe('ring');
  });

  it('свайп вправо увеличивает счётчик «знаю»', () => {
    const started = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    const state = appReducer(started, { type: 'swiped', direction: 'right' });
    expect(state.stats).toEqual({ known: 1, unknown: 0 });
  });

  it('свайп влево увеличивает счётчик «не знаю»', () => {
    const started = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    const state = appReducer(started, { type: 'swiped', direction: 'left' });
    expect(state.stats).toEqual({ known: 0, unknown: 1 });
  });

  it('завершение сессии ведёт на экран итогов', () => {
    let state = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    state = appReducer(state, { type: 'swiped', direction: 'right' });
    state = appReducer(state, { type: 'swiped', direction: 'right' });
    expect(state.screen).toBe('done');
    expect(state.session?.finished).toBe(true);
  });

  it('свайп без сессии ничего не меняет', () => {
    const state = withDeck();
    expect(appReducer(state, { type: 'swiped', direction: 'right' })).toBe(state);
  });
});

describe('restore', () => {
  const stored = (session: StoredState['session']): StoredState => ({
    version: STORAGE_VERSION,
    cards,
    direction: 'translation-to-hanzi',
    session,
    stats: { known: 3, unknown: 1 },
  });

  it('незавершённая сессия ведёт на экран возобновления', () => {
    const session: SimpleSession = {
      mode: 'simple', round: 2, queue: ['c1'], nextRound: [],
      perfectRound: true, finalRound: false, finished: false,
    };
    const state = appReducer(initialState, { type: 'restore', stored: stored(session) });
    expect(state.screen).toBe('resume');
    expect(state.stats).toEqual({ known: 3, unknown: 1 });
    expect(state.direction).toBe('translation-to-hanzi');
    expect(state.hydrated).toBe(true);
  });

  it('без сессии ведёт на выбор режима', () => {
    const state = appReducer(initialState, { type: 'restore', stored: stored(null) });
    expect(state.screen).toBe('mode');
  });

  it('пустая колода ведёт на импорт', () => {
    const state = appReducer(initialState, {
      type: 'restore',
      stored: { ...stored(null), cards: [] },
    });
    expect(state.screen).toBe('import');
    expect(state.hydrated).toBe(true);
  });
});

describe('навигация', () => {
  it('hydration-finished только поднимает флаг', () => {
    const state = appReducer(initialState, { type: 'hydration-finished' });
    expect(state.hydrated).toBe(true);
    expect(state.screen).toBe('import');
  });

  it('resume-confirmed ведёт на тренировку', () => {
    const state = appReducer({ ...withDeck(), screen: 'resume' }, { type: 'resume-confirmed' });
    expect(state.screen).toBe('training');
  });

  it('go-to-import ведёт на импорт, не трогая колоду', () => {
    const state = appReducer(withDeck(), { type: 'go-to-import' });
    expect(state.screen).toBe('import');
    expect(state.cards).toHaveLength(2);
  });

  it('go-to-mode сбрасывает сессию', () => {
    const started = appReducer(withDeck(), { type: 'session-started', mode: 'simple' });
    const state = appReducer(started, { type: 'go-to-mode' });
    expect(state.screen).toBe('mode');
    expect(state.session).toBeNull();
  });

  it('direction-changed меняет направление', () => {
    const state = appReducer(withDeck(), { type: 'direction-changed', direction: 'hanzi-to-pinyin' });
    expect(state.direction).toBe('hanzi-to-pinyin');
  });

  it('storage-failed поднимает флаг', () => {
    expect(appReducer(initialState, { type: 'storage-failed' }).storageFailed).toBe(true);
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/state/appReducer.test.ts
```

Ожидается: FAIL, «Failed to resolve import "@/state/appReducer"».

- [ ] **Step 3: Реализовать appReducer.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/state/appReducer.ts <<'EOF'
import { hasPinyin } from '@/core/deck';
import type { Card, Direction } from '@/core/deck';
import { createSession, swipe } from '@/core/session';
import type { Session, SessionMode, SwipeDirection } from '@/core/session';
import type { Stats, StoredState } from '@/core/storage';

export type Screen = 'resume' | 'import' | 'mode' | 'training' | 'done';

export type AppState = {
  cards: Card[];
  direction: Direction;
  session: Session | null;
  /** Режим, которым сессия была запущена: после колец session.mode становится 'simple'. */
  startedMode: SessionMode;
  stats: Stats;
  screen: Screen;
  /** true после того, как попытка прочитать хранилище завершилась — успехом или нет. */
  hydrated: boolean;
  storageFailed: boolean;
};

export type AppAction =
  | { type: 'restore'; stored: StoredState }
  | { type: 'hydration-finished' }
  | { type: 'deck-imported'; cards: Card[] }
  | { type: 'direction-changed'; direction: Direction }
  | { type: 'session-started'; mode: SessionMode }
  | { type: 'swiped'; direction: SwipeDirection }
  | { type: 'resume-confirmed' }
  | { type: 'go-to-import' }
  | { type: 'go-to-mode' }
  | { type: 'storage-failed' };

const NO_STATS: Stats = { known: 0, unknown: 0 };

export const initialState: AppState = {
  cards: [],
  direction: 'hanzi-to-translation',
  session: null,
  startedMode: 'simple',
  stats: NO_STATS,
  screen: 'import',
  hydrated: false,
  storageFailed: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'restore': {
      const { cards, direction, session, stats } = action.stored;
      if (cards.length === 0) {
        return { ...initialState, hydrated: true };
      }
      const resumable = session !== null && !session.finished;
      return {
        ...state,
        cards,
        direction,
        session: resumable ? session : null,
        startedMode: session?.mode === 'ring' ? 'ring' : 'simple',
        stats,
        screen: resumable ? 'resume' : 'mode',
        hydrated: true,
      };
    }

    case 'hydration-finished':
      return { ...state, hydrated: true };

    case 'deck-imported':
      return {
        ...state,
        cards: action.cards,
        direction: availableDirection(state.direction, action.cards),
        session: null,
        stats: NO_STATS,
        screen: 'mode',
      };

    case 'direction-changed':
      return { ...state, direction: action.direction };

    case 'session-started':
      return {
        ...state,
        session: createSession(
          state.cards.map((card) => card.id),
          action.mode,
        ),
        startedMode: action.mode,
        stats: NO_STATS,
        screen: 'training',
      };

    case 'swiped': {
      if (state.session === null) return state;
      const session = swipe(state.session, action.direction);
      const stats =
        action.direction === 'right'
          ? { ...state.stats, known: state.stats.known + 1 }
          : { ...state.stats, unknown: state.stats.unknown + 1 };
      return { ...state, session, stats, screen: session.finished ? 'done' : 'training' };
    }

    case 'resume-confirmed':
      return { ...state, screen: 'training' };

    case 'go-to-import':
      return { ...state, screen: 'import' };

    case 'go-to-mode':
      return { ...state, session: null, screen: 'mode' };

    case 'storage-failed':
      return { ...state, storageFailed: true };
  }
}

/** Направление на пиньинь бессмысленно для колоды без пиньиня. */
function availableDirection(direction: Direction, cards: readonly Card[]): Direction {
  if (direction === 'hanzi-to-pinyin' && !hasPinyin(cards)) return 'hanzi-to-translation';
  return direction;
}
EOF
```

- [ ] **Step 4: Реализовать AppContext.tsx**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/state/AppContext.tsx <<'EOF'
import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { appReducer, initialState } from '@/state/appReducer';
import type { AppAction, AppState } from '@/state/appReducer';

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<AppAction> | null>(null);

/** `initial` нужен только тестам: он позволяет отрисовать экран с готовой колодой. */
export function AppProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(appReducer, initial ?? initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (state === null) throw new Error('useAppState must be used inside AppProvider');
  return state;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const dispatch = useContext(DispatchContext);
  if (dispatch === null) throw new Error('useAppDispatch must be used inside AppProvider');
  return dispatch;
}
EOF
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/state/appReducer.test.ts && npm run lint && npm run typecheck
```

Ожидается: все тесты зелёные.

- [ ] **Step 6: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/state
git commit -m "feat: add the app reducer and context provider

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Сохранение и восстановление состояния

Главная ловушка здесь — записать пустое начальное состояние поверх сохранённого до того, как чтение успело подействовать. Защита — флаг `hydrated`: запись включается только после того, как попытка чтения завершилась.

**Files:**
- Create: `src/hooks/usePersistence.ts`, `src/hooks/usePersistence.test.tsx`

**Interfaces:**
- Consumes: `loadState`, `saveState`, `STORAGE_VERSION`, `StorageLike` из `@/core/storage`; `AppState`, `AppAction` из `@/state/appReducer`
- Produces:
  - `usePersistence(state: AppState, dispatch: Dispatch<AppAction>, storage: StorageLike | null): void`
  - `browserStorage(): StorageLike | null`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
mkdir -p src/hooks
cat > src/hooks/usePersistence.test.tsx <<'EOF'
import { renderHook } from '@testing-library/react';
import { useReducer } from 'react';
import { usePersistence } from '@/hooks/usePersistence';
import { STORAGE_KEY, STORAGE_VERSION } from '@/core/storage';
import type { StorageLike, StoredState } from '@/core/storage';
import { appReducer, initialState } from '@/state/appReducer';

function memoryStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  const storage: StorageLike = {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
  return { storage, data };
}

const stored: StoredState = {
  version: STORAGE_VERSION,
  cards: [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' }],
  direction: 'hanzi-to-translation',
  session: null,
  stats: { known: 0, unknown: 0 },
};

function renderWithPersistence(storage: StorageLike | null) {
  return renderHook(() => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    usePersistence(state, dispatch, storage);
    return state;
  });
}

describe('usePersistence', () => {
  it('восстанавливает сохранённое состояние при монтировании', () => {
    const { storage } = memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
    const { result } = renderWithPersistence(storage);
    expect(result.current.cards).toHaveLength(1);
    expect(result.current.screen).toBe('mode');
    expect(result.current.hydrated).toBe(true);
  });

  it('не затирает сохранённое состояние пустым при старте', () => {
    const { storage, data } = memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
    renderWithPersistence(storage);
    const written = JSON.parse(data[STORAGE_KEY] ?? '{}') as StoredState;
    expect(written.cards).toHaveLength(1);
  });

  it('на пустом хранилище поднимает hydrated и остаётся на импорте', () => {
    const { storage } = memoryStorage();
    const { result } = renderWithPersistence(storage);
    expect(result.current.hydrated).toBe(true);
    expect(result.current.screen).toBe('import');
  });

  it('записывает состояние после гидратации', () => {
    const { storage, data } = memoryStorage();
    renderWithPersistence(storage);
    expect(data[STORAGE_KEY]).toBeDefined();
    expect(JSON.parse(data[STORAGE_KEY] ?? '{}')).toMatchObject({ version: STORAGE_VERSION });
  });

  it('поднимает storageFailed, если запись отказала', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const { result } = renderWithPersistence(failing);
    expect(result.current.storageFailed).toBe(true);
  });

  it('без хранилища работает молча', () => {
    const { result } = renderWithPersistence(null);
    expect(result.current.hydrated).toBe(true);
    expect(result.current.storageFailed).toBe(false);
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/hooks/usePersistence.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/hooks/usePersistence"».

- [ ] **Step 3: Реализовать usePersistence.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/hooks/usePersistence.ts <<'EOF'
import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import { STORAGE_VERSION, loadState, saveState } from '@/core/storage';
import type { StorageLike } from '@/core/storage';
import type { AppAction, AppState } from '@/state/appReducer';

/** localStorage недоступен в некоторых приватных режимах — обращение к нему бросает. */
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function usePersistence(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  storage: StorageLike | null,
): void {
  // Ref, а не состояние: StrictMode вызывает эффекты дважды, читать нужно один раз.
  const loadAttempted = useRef(false);

  useEffect(() => {
    if (loadAttempted.current) return;
    loadAttempted.current = true;

    const stored = storage === null ? null : loadState(storage);
    if (stored === null) {
      dispatch({ type: 'hydration-finished' });
      return;
    }
    dispatch({ type: 'restore', stored });
  }, [dispatch, storage]);

  useEffect(() => {
    // Запись до гидратации затёрла бы сохранённое состояние пустым начальным.
    if (!state.hydrated || storage === null) return;

    const saved = saveState(storage, {
      version: STORAGE_VERSION,
      cards: state.cards,
      direction: state.direction,
      session: state.session,
      stats: state.stats,
    });
    if (!saved && !state.storageFailed) {
      dispatch({ type: 'storage-failed' });
    }
  }, [
    state.hydrated,
    state.cards,
    state.direction,
    state.session,
    state.stats,
    state.storageFailed,
    dispatch,
    storage,
  ]);
}
EOF
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/hooks/usePersistence.test.tsx && npm run lint && npm run typecheck
```

Ожидается: 6 тестов зелёные.

- [ ] **Step 5: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/hooks/usePersistence.ts src/hooks/usePersistence.test.tsx
git commit -m "feat: persist and restore app state through localStorage

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Оформление и карточка

**Files:**
- Create: `src/styles/app.css`, `src/components/Card.tsx`, `src/components/Card.test.tsx`
- Modify: `src/styles/tokens.css`, `src/main.tsx`

**Interfaces:**
- Consumes: `CardFace` из `@/core/deck`; `SwipeDirection` из `@/core/session`
- Produces:
  - `type CardPointerHandlers` — четыре обработчика указателя для передачи в карточку
  - компонент `Card` со свойствами `{ front, back, flipped, dragX, dragging, exiting, handlers }`

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
mkdir -p src/components
cat > src/components/Card.test.tsx <<'EOF'
import { render, screen } from '@testing-library/react';
import Card from '@/components/Card';
import { backFace, frontFace } from '@/core/deck';
import type { Card as CardType } from '@/core/deck';

const card: CardType = { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' };
const noop = () => {};
const handlers = {
  onPointerDown: noop,
  onPointerMove: noop,
  onPointerUp: noop,
  onPointerCancel: noop,
};

function renderCard(flipped: boolean, direction: Parameters<typeof frontFace>[1]) {
  return render(
    <Card
      front={frontFace(card, direction)}
      back={backFace(card, direction)}
      flipped={flipped}
      dragX={0}
      dragging={false}
      exiting={null}
      handlers={handlers}
    />,
  );
}

describe('Card', () => {
  it('показывает лицевую сторону', () => {
    renderCard(false, 'hanzi-to-translation');
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.queryByText('привет')).not.toBeInTheDocument();
  });

  it('показывает обратную сторону после переворота', () => {
    renderCard(true, 'hanzi-to-translation');
    expect(screen.getByText('привет')).toBeInTheDocument();
    expect(screen.getByText('nǐ hǎo')).toBeInTheDocument();
  });

  it('помечает иероглиф отдельным классом', () => {
    renderCard(false, 'hanzi-to-translation');
    expect(screen.getByText('你好')).toHaveClass('card__main--hanzi');
  });

  it('не помечает перевод как иероглиф', () => {
    renderCard(false, 'translation-to-hanzi');
    expect(screen.getByText('привет')).not.toHaveClass('card__main--hanzi');
  });

  it('не выводит пустые строки', () => {
    render(
      <Card
        front={frontFace({ ...card, pinyin: '' }, 'hanzi-to-translation')}
        back={backFace({ ...card, pinyin: '' }, 'hanzi-to-translation')}
        flipped
        dragX={0}
        dragging={false}
        exiting={null}
        handlers={handlers}
      />,
    );
    expect(screen.getByText('привет')).toBeInTheDocument();
    expect(document.querySelectorAll('.card__secondary')).toHaveLength(0);
  });

  it('доступна с клавиатуры', () => {
    renderCard(false, 'hanzi-to-translation');
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/components/Card.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/components/Card"».

- [ ] **Step 3: Написать токены оформления**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/styles/tokens.css <<'EOF'
:root {
  color-scheme: dark;

  --bg: #0a092d;
  --surface: #2e3856;
  --surface-raised: #3a4a6b;
  --text: #f6f7fb;
  --text-muted: #a0a8c0;
  --accent: #4255ff;
  --yes: #3ccf91;
  --no: #ff5a5f;

  --radius: 16px;
  --gap: 1rem;

  --font-ui: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  /* Только системные шрифты: веб-шрифт для CJK весит мегабайты и сломает офлайн. */
  --font-hanzi: 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;

  --size-hanzi: clamp(4rem, 18vh, 12rem);
  --size-translation: clamp(1.5rem, 5vh, 3rem);
  --size-pinyin: clamp(1.25rem, 4vh, 2.5rem);
  --size-tertiary: clamp(1rem, 2.5vh, 1.5rem);

  --card-width: min(90vw, 60rem);
  --card-height: min(60vh, 34rem);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
}
EOF
```

- [ ] **Step 4: Написать стили карточки и оболочки**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/styles/app.css <<'EOF'
.screen {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gap);
  padding: var(--gap);
  text-align: center;
}

.btn {
  font: inherit;
  font-size: 1.125rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  background: var(--accent);
  color: var(--text);
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn--quiet {
  background: var(--surface-raised);
}

.link-button {
  font: inherit;
  background: none;
  border: none;
  color: var(--text-muted);
  text-decoration: underline;
  cursor: pointer;
}

.card {
  width: var(--card-width);
  height: var(--card-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 3px solid transparent;
  border-radius: var(--radius);
  cursor: pointer;
  touch-action: none;
  user-select: none;
  transition: transform 220ms ease, border-color 120ms ease;
}

.card--dragging {
  transition: border-color 120ms ease;
}

.card--exiting {
  transition: transform 220ms ease;
}

.card--yes {
  border-color: var(--yes);
}

.card--no {
  border-color: var(--no);
}

.card__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: var(--gap);
}

.card__main {
  margin: 0;
  font-size: var(--size-translation);
}

.card__main--hanzi {
  font-family: var(--font-hanzi);
  font-size: var(--size-hanzi);
  line-height: 1.1;
}

.card__secondary {
  margin: 0;
  font-size: var(--size-pinyin);
  color: var(--text-muted);
}

.card__tertiary {
  margin: 0;
  font-size: var(--size-tertiary);
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
EOF
python3 - <<'PY'
import io
p = 'src/main.tsx'
s = io.open(p, encoding='utf-8').read()
s = s.replace("import '@/styles/tokens.css';", "import '@/styles/tokens.css';\nimport '@/styles/app.css';")
io.open(p, 'w', encoding='utf-8').write(s)
PY
```

- [ ] **Step 5: Реализовать Card.tsx**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/components/Card.tsx <<'EOF'
import type { PointerEventHandler } from 'react';
import type { CardFace } from '@/core/deck';
import type { SwipeDirection } from '@/core/session';

export type CardPointerHandlers = {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
};

type CardProps = {
  front: CardFace;
  back: CardFace;
  flipped: boolean;
  dragX: number;
  dragging: boolean;
  exiting: SwipeDirection | null;
  handlers: CardPointerHandlers;
};

const EXIT_DISTANCE = 1200;
const TINT_THRESHOLD = 20;

export default function Card({
  front,
  back,
  flipped,
  dragX,
  dragging,
  exiting,
  handlers,
}: CardProps) {
  const face = flipped ? back : front;
  const offset = exiting === null ? dragX : (exiting === 'right' ? 1 : -1) * EXIT_DISTANCE;

  const className = [
    'card',
    dragging ? 'card--dragging' : '',
    exiting !== null ? 'card--exiting' : '',
    dragX > TINT_THRESHOLD || exiting === 'right' ? 'card--yes' : '',
    dragX < -TINT_THRESHOLD || exiting === 'left' ? 'card--no' : '',
  ]
    .filter((name) => name !== '')
    .join(' ');

  return (
    <div
      className={className}
      style={{ transform: `translateX(${offset}px) rotate(${offset / 20}deg)` }}
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Обратная сторона карточки' : 'Лицевая сторона карточки'}
      {...handlers}
    >
      <div className="card__body" aria-live="polite">
        <p className={face.mainIsHanzi ? 'card__main card__main--hanzi' : 'card__main'}>
          {face.main}
        </p>
        {face.secondary !== '' && <p className="card__secondary">{face.secondary}</p>}
        {face.tertiary !== '' && <p className="card__tertiary">{face.tertiary}</p>}
      </div>
    </div>
  );
}
EOF
```

- [ ] **Step 6: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/components/Card.test.tsx && npm run lint && npm run typecheck
```

Ожидается: 6 тестов зелёные.

- [ ] **Step 7: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/styles src/components/Card.tsx src/components/Card.test.tsx src/main.tsx
git commit -m "feat: add design tokens and the card component

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Жесты

Переворот карточки реализован через `pointerup` с малым смещением, а не отдельным обработчиком клика. Именно раздельные обработчики давали в прототипе гонку между перетаскиванием и кликом (исправлено коммитом `d971618`); одна точка входа делает такую гонку невозможной по построению.

**Files:**
- Create: `src/hooks/useSwipeGesture.ts`, `src/hooks/useSwipeGesture.test.tsx`
- Modify: `src/test/setup.ts`

**Interfaces:**
- Consumes: `SwipeDirection` из `@/core/session`; `CardPointerHandlers` из `@/components/Card`
- Produces:
  - `const SWIPE_THRESHOLD = 80`
  - `useSwipeGesture(options: { onSwipe: (d: SwipeDirection) => void; onFlip: () => void; disabled: boolean }): { dragX: number; dragging: boolean; handlers: CardPointerHandlers }`

- [ ] **Step 1: Дополнить setup тестов полифилами**

jsdom не реализует `PointerEvent` и `setPointerCapture`. Без этих заглушек тесты жестов падают на ровном месте, и это не баг приложения.

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/test/setup.ts <<'EOF'
import '@testing-library/jest-dom/vitest';

// jsdom не реализует PointerEvent: без полифила fireEvent.pointerDown
// не донесёт до обработчика ни clientX, ни pointerId.
class PointerEventPolyfill extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
  }
}

if (!('PointerEvent' in window)) {
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
if (Element.prototype.setPointerCapture === undefined) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
EOF
```

- [ ] **Step 2: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/hooks/useSwipeGesture.test.tsx <<'EOF'
import { fireEvent, render, screen } from '@testing-library/react';
import { SWIPE_THRESHOLD, useSwipeGesture } from '@/hooks/useSwipeGesture';
import type { SwipeDirection } from '@/core/session';

type HarnessProps = {
  onSwipe: (direction: SwipeDirection) => void;
  onFlip: () => void;
  disabled?: boolean;
};

function Harness({ onSwipe, onFlip, disabled = false }: HarnessProps) {
  const { dragX, dragging, handlers } = useSwipeGesture({ onSwipe, onFlip, disabled });
  return (
    <div data-testid="target" {...handlers}>
      <span data-testid="dragX">{dragX}</span>
      <span data-testid="dragging">{String(dragging)}</span>
      <button type="button">Знаю</button>
    </div>
  );
}

function drag(distance: number) {
  const target = screen.getByTestId('target');
  fireEvent.pointerDown(target, { pointerId: 1, clientX: 200 });
  fireEvent.pointerMove(target, { pointerId: 1, clientX: 200 + distance });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: 200 + distance });
}

describe('useSwipeGesture: перетаскивание', () => {
  it('смещение вправо больше порога — свайп вправо', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    drag(SWIPE_THRESHOLD + 1);
    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('смещение влево больше порога — свайп влево', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    drag(-(SWIPE_THRESHOLD + 1));
    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('смещение меньше порога не считается свайпом', () => {
    const onSwipe = vi.fn();
    const onFlip = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={onFlip} />);
    drag(30);
    expect(onSwipe).not.toHaveBeenCalled();
    expect(onFlip).not.toHaveBeenCalled();
  });

  it('нажатие без смещения переворачивает карточку', () => {
    const onFlip = vi.fn();
    render(<Harness onSwipe={vi.fn()} onFlip={onFlip} />);
    drag(0);
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('отражает смещение во время перетаскивания', () => {
    render(<Harness onSwipe={vi.fn()} onFlip={vi.fn()} />);
    const target = screen.getByTestId('target');
    fireEvent.pointerDown(target, { pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 250 });
    expect(screen.getByTestId('dragX')).toHaveTextContent('50');
    expect(screen.getByTestId('dragging')).toHaveTextContent('true');
  });

  it('после отпускания смещение сбрасывается', () => {
    render(<Harness onSwipe={vi.fn()} onFlip={vi.fn()} />);
    drag(100);
    expect(screen.getByTestId('dragX')).toHaveTextContent('0');
    expect(screen.getByTestId('dragging')).toHaveTextContent('false');
  });

  it('отмена указателя сбрасывает перетаскивание без свайпа', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    const target = screen.getByTestId('target');
    fireEvent.pointerDown(target, { pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: 400 });
    fireEvent.pointerCancel(target, { pointerId: 1 });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(screen.getByTestId('dragX')).toHaveTextContent('0');
  });
});

describe('useSwipeGesture: клавиатура', () => {
  it('стрелка вправо — свайп вправо', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('стрелка влево — свайп влево', () => {
    const onSwipe = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('пробел переворачивает карточку', () => {
    const onFlip = vi.fn();
    render(<Harness onSwipe={vi.fn()} onFlip={onFlip} />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('не перехватывает клавиши, когда фокус на кнопке', () => {
    const onFlip = vi.fn();
    render(<Harness onSwipe={vi.fn()} onFlip={onFlip} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Знаю' }), { key: 'Enter' });
    expect(onFlip).not.toHaveBeenCalled();
  });
});

describe('useSwipeGesture: блокировка', () => {
  it('в заблокированном состоянии не реагирует ни на что', () => {
    const onSwipe = vi.fn();
    const onFlip = vi.fn();
    render(<Harness onSwipe={onSwipe} onFlip={onFlip} disabled />);
    drag(200);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(onFlip).not.toHaveBeenCalled();
  });
});
EOF
```

- [ ] **Step 3: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/hooks/useSwipeGesture.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/hooks/useSwipeGesture"».

- [ ] **Step 4: Реализовать useSwipeGesture.ts**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/hooks/useSwipeGesture.ts <<'EOF'
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CardPointerHandlers } from '@/components/Card';
import type { SwipeDirection } from '@/core/session';

export const SWIPE_THRESHOLD = 80;

/** Смещение, ниже которого отпускание считается нажатием, а не перетаскиванием. */
const TAP_TOLERANCE = 5;

const TYPING_TAGS = new Set(['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']);

type Options = {
  onSwipe: (direction: SwipeDirection) => void;
  onFlip: () => void;
  disabled: boolean;
};

export function useSwipeGesture({ onSwipe, onFlip, disabled }: Options): {
  dragX: number;
  dragging: boolean;
  handlers: CardPointerHandlers;
} {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const activePointer = useRef<number | null>(null);

  const reset = useCallback(() => {
    activePointer.current = null;
    setDragging(false);
    setDragX(0);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      activePointer.current = event.pointerId;
      startX.current = event.clientX;
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || activePointer.current !== event.pointerId) return;
      setDragX(event.clientX - startX.current);
    },
    [disabled],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointer.current !== event.pointerId) return;
      const distance = event.clientX - startX.current;
      reset();
      if (disabled) return;

      // Одна точка входа для свайпа и переворота: отдельный обработчик клика
      // давал гонку с перетаскиванием.
      if (distance > SWIPE_THRESHOLD) {
        onSwipe('right');
      } else if (distance < -SWIPE_THRESHOLD) {
        onSwipe('left');
      } else if (Math.abs(distance) <= TAP_TOLERANCE) {
        onFlip();
      }
    },
    [disabled, onFlip, onSwipe, reset],
  );

  const onPointerCancel = useCallback(() => reset(), [reset]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (disabled) return;
      // Кнопки обрабатывают Enter и пробел сами — иначе сработает дважды.
      const target = event.target;
      if (target instanceof HTMLElement && TYPING_TAGS.has(target.tagName)) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onSwipe('right');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onSwipe('left');
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onFlip();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onFlip, onSwipe]);

  return {
    dragX,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
EOF
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/hooks/useSwipeGesture.test.tsx && npm run lint && npm run typecheck
```

Ожидается: 12 тестов зелёные.

- [ ] **Step 6: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/hooks/useSwipeGesture.ts src/hooks/useSwipeGesture.test.tsx src/test/setup.ts
git commit -m "feat: add pointer and keyboard swipe gestures

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Экран импорта

**Files:**
- Create: `src/core/plural.ts`, `src/core/plural.test.ts`, `src/test/render.tsx`, `src/screens/ImportScreen.tsx`, `src/screens/ImportScreen.test.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `parseTable`, `ColumnMode` из `@/core/parse`; `useAppState`, `useAppDispatch` из `@/state/AppContext`
- Produces:
  - `plural(count: number, forms: [string, string, string]): string`
  - `renderWithProvider(ui: ReactElement, initial?: AppState): RenderResult` из `@/test/render`
  - компонент `ImportScreen` без свойств

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/plural.test.ts <<'EOF'
import { plural } from '@/core/plural';

const CARDS: [string, string, string] = ['карточка', 'карточки', 'карточек'];

describe('plural', () => {
  it('единственное число', () => {
    expect(plural(1, CARDS)).toBe('карточка');
    expect(plural(21, CARDS)).toBe('карточка');
  });

  it('от двух до четырёх', () => {
    expect(plural(2, CARDS)).toBe('карточки');
    expect(plural(34, CARDS)).toBe('карточки');
  });

  it('множественное число', () => {
    expect(plural(0, CARDS)).toBe('карточек');
    expect(plural(5, CARDS)).toBe('карточек');
    expect(plural(11, CARDS)).toBe('карточек');
    expect(plural(112, CARDS)).toBe('карточек');
  });
});
EOF
cat > src/screens/ImportScreen.test.tsx <<'EOF'
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportScreen from '@/screens/ImportScreen';
import { renderWithProvider } from '@/test/render';

const TABLE = '你好\tni3 hao3\tпривет\n谢谢\txie4xie5\tспасибо';

describe('ImportScreen', () => {
  it('кнопка создания колоды выключена на пустом вводе', () => {
    renderWithProvider(<ImportScreen />);
    expect(screen.getByRole('button', { name: 'Создать колоду' })).toBeDisabled();
  });

  it('показывает превью разобранных карточек', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);
    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste(TABLE);

    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText('nǐ hǎo')).toBeInTheDocument();
    expect(screen.getByText('привет')).toBeInTheDocument();
  });

  it('сообщает о числе добавленных карточек', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);
    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste(TABLE);

    expect(screen.getByText('Добавлено 2 карточки')).toBeInTheDocument();
  });

  it('сообщает о пропущенных строках', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);
    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste('你好,привет\nмусор');

    expect(screen.getByText('Добавлено 1 карточка, пропущена 1 строка')).toBeInTheDocument();
  });

  it('показывает не больше пяти строк превью', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);
    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste(Array.from({ length: 9 }, (_, i) => `字${i},слово${i}`).join('\n'));

    expect(screen.getAllByTestId('preview-row')).toHaveLength(5);
    expect(screen.getByText('…и ещё 4')).toBeInTheDocument();
  });

  it('переключатель колонок меняет разбор', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ImportScreen />);
    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste('你好,hello,greeting');

    // Авто принимает латиницу за пиньинь.
    expect(screen.getByText('hello')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Иероглиф + перевод'));
    expect(screen.getByText('hello, greeting')).toBeInTheDocument();
  });

  it('кнопка отмены скрыта, пока колоды нет', () => {
    renderWithProvider(<ImportScreen />);
    expect(screen.queryByRole('button', { name: 'Отменить' })).not.toBeInTheDocument();
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/plural.test.ts src/screens/ImportScreen.test.tsx
```

Ожидается: FAIL, не разрешаются импорты `@/core/plural`, `@/test/render`, `@/screens/ImportScreen`.

- [ ] **Step 3: Реализовать plural.ts и тестовый хелпер**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/core/plural.ts <<'EOF'
/**
 * Русская форма слова по числу: [1 карточка, 2 карточки, 5 карточек].
 */
export function plural(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}
EOF
mkdir -p src/test
cat > src/test/render.tsx <<'EOF'
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AppProvider } from '@/state/AppContext';
import type { AppState } from '@/state/appReducer';

export function renderWithProvider(ui: ReactElement, initial?: AppState): RenderResult {
  return render(<AppProvider initial={initial}>{ui}</AppProvider>);
}
EOF
```

- [ ] **Step 4: Реализовать ImportScreen.tsx**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
mkdir -p src/screens
cat > src/screens/ImportScreen.tsx <<'EOF'
import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { plural } from '@/core/plural';
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
  const { cards } = useAppState();
  const dispatch = useAppDispatch();
  const [text, setText] = useState('');
  const [columnMode, setColumnMode] = useState<ColumnMode>('auto');
  const fileInput = useRef<HTMLInputElement>(null);

  const result = useMemo(() => parseTable(text, columnMode), [text, columnMode]);
  const preview = result.cards.slice(0, PREVIEW_LIMIT);
  const hidden = result.cards.length - preview.length;

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.onerror = () => setText('');
    reader.readAsText(file);
    event.target.value = '';
  }

  return (
    <section className="screen">
      <h1>Вставьте таблицу со словами</h1>

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
          hidden
          onChange={handleFile}
        />
      </div>

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
            {preview.map((card) => (
              <tr key={card.id} data-testid="preview-row">
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
        onClick={() => dispatch({ type: 'deck-imported', cards: result.cards })}
      >
        Создать колоду
      </button>

      {cards.length > 0 && (
        <button
          type="button"
          className="link-button"
          onClick={() => dispatch({ type: 'go-to-mode' })}
        >
          Отменить
        </button>
      )}
    </section>
  );
}

function describe(added: number, skipped: number): string {
  if (added === 0 && skipped === 0) return '';
  const addedText = `Добавлено ${added} ${plural(added, ['карточка', 'карточки', 'карточек'])}`;
  if (skipped === 0) return addedText;
  const skippedVerb = plural(skipped, ['пропущена', 'пропущено', 'пропущено']);
  const skippedNoun = plural(skipped, ['строка', 'строки', 'строк']);
  return `${addedText}, ${skippedVerb} ${skipped} ${skippedNoun}`;
}
EOF
cat >> src/styles/app.css <<'EOF'

.import__textarea {
  width: min(90vw, 48rem);
  min-height: 12rem;
  padding: var(--gap);
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--surface-raised);
  border-radius: var(--radius);
  resize: vertical;
}

.import__columns {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  border: 1px solid var(--surface-raised);
  border-radius: var(--radius);
  padding: 0.75rem var(--gap);
}

.import__columns label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.import__preview {
  width: min(90vw, 48rem);
  border-collapse: collapse;
  font-size: 0.95rem;
}

.import__preview th,
.import__preview td {
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--surface-raised);
  text-align: left;
}

.import__preview th {
  color: var(--text-muted);
  font-weight: 500;
}

.import__more,
.import__message {
  margin: 0;
  color: var(--text-muted);
}
EOF
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/core/plural.test.ts src/screens/ImportScreen.test.tsx && npm run lint && npm run typecheck
```

Ожидается: 3 теста `plural` и 7 тестов `ImportScreen` зелёные.

- [ ] **Step 6: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/core/plural.ts src/core/plural.test.ts src/test/render.tsx src/screens/ImportScreen.tsx src/screens/ImportScreen.test.tsx src/styles/app.css
git commit -m "feat: add the import screen with column control and preview

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Экран выбора режима

**Files:**
- Create: `src/screens/ModeScreen.tsx`, `src/screens/ModeScreen.test.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `DIRECTIONS`, `DIRECTION_LABELS`, `hasPinyin` из `@/core/deck`; `plural` из `@/core/plural`; `useAppState`, `useAppDispatch` из `@/state/AppContext`
- Produces: компонент `ModeScreen` без свойств

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/screens/ModeScreen.test.tsx <<'EOF'
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModeScreen from '@/screens/ModeScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import type { Card } from '@/core/deck';

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function stateWith(overrides: Partial<AppState> = {}): AppState {
  return { ...initialState, cards, hydrated: true, screen: 'mode', ...overrides };
}

describe('ModeScreen', () => {
  it('показывает размер колоды', () => {
    renderWithProvider(<ModeScreen />, stateWith());
    expect(screen.getByRole('heading', { name: 'Колода готова: 2 карточки' })).toBeInTheDocument();
  });

  it('предлагает три направления', () => {
    renderWithProvider(<ModeScreen />, stateWith());
    expect(screen.getByLabelText('Иероглиф → перевод')).toBeInTheDocument();
    expect(screen.getByLabelText('Перевод → иероглиф')).toBeInTheDocument();
    expect(screen.getByLabelText('Иероглиф → пиньинь')).toBeInTheDocument();
  });

  it('отмечает текущее направление', () => {
    renderWithProvider(<ModeScreen />, stateWith({ direction: 'translation-to-hanzi' }));
    expect(screen.getByLabelText('Перевод → иероглиф')).toBeChecked();
  });

  it('выключает направление на пиньинь для колоды без пиньиня', () => {
    const withoutPinyin = cards.map((card) => ({ ...card, pinyin: '' }));
    renderWithProvider(<ModeScreen />, stateWith({ cards: withoutPinyin }));
    expect(screen.getByLabelText('Иероглиф → пиньинь')).toBeDisabled();
    expect(screen.getByText('В колоде нет пиньиня')).toBeInTheDocument();
  });

  it('смена направления отражается в отметке', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ModeScreen />, stateWith());
    await user.click(screen.getByLabelText('Иероглиф → пиньинь'));
    expect(screen.getByLabelText('Иероглиф → пиньинь')).toBeChecked();
  });

  it('предлагает оба режима тренировки', () => {
    renderWithProvider(<ModeScreen />, stateWith());
    expect(screen.getByRole('button', { name: 'Простой просмотр' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Заучивание кольцами по 7' })).toBeInTheDocument();
  });

  it('даёт ссылку на загрузку новой таблицы', () => {
    renderWithProvider(<ModeScreen />, stateWith());
    expect(screen.getByRole('button', { name: 'Загрузить новую таблицу' })).toBeInTheDocument();
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/screens/ModeScreen.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/screens/ModeScreen"».

- [ ] **Step 3: Реализовать ModeScreen.tsx**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/screens/ModeScreen.tsx <<'EOF'
import { DIRECTIONS, DIRECTION_LABELS, hasPinyin } from '@/core/deck';
import { plural } from '@/core/plural';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function ModeScreen() {
  const { cards, direction } = useAppState();
  const dispatch = useAppDispatch();
  const pinyinAvailable = hasPinyin(cards);

  return (
    <section className="screen">
      <h1>
        {`Колода готова: ${cards.length} ${plural(cards.length, ['карточка', 'карточки', 'карточек'])}`}
      </h1>

      <fieldset className="mode__directions">
        <legend>Что спрашиваем</legend>
        {DIRECTIONS.map((value) => {
          const disabled = value === 'hanzi-to-pinyin' && !pinyinAvailable;
          return (
            <label key={value}>
              <input
                type="radio"
                name="direction"
                value={value}
                checked={direction === value}
                disabled={disabled}
                onChange={() => dispatch({ type: 'direction-changed', direction: value })}
              />
              {DIRECTION_LABELS[value]}
            </label>
          );
        })}
        {!pinyinAvailable && <p className="mode__hint">В колоде нет пиньиня</p>}
      </fieldset>

      <div className="mode__buttons">
        <button
          type="button"
          className="btn"
          onClick={() => dispatch({ type: 'session-started', mode: 'simple' })}
        >
          Простой просмотр
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => dispatch({ type: 'session-started', mode: 'ring' })}
        >
          Заучивание кольцами по 7
        </button>
      </div>

      <button type="button" className="link-button" onClick={() => dispatch({ type: 'go-to-import' })}>
        Загрузить новую таблицу
      </button>
    </section>
  );
}
EOF
cat >> src/styles/app.css <<'EOF'

.mode__directions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
  border: 1px solid var(--surface-raised);
  border-radius: var(--radius);
  padding: 0.75rem var(--gap);
}

.mode__directions label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.mode__directions input:disabled + * ,
.mode__directions label:has(input:disabled) {
  color: var(--text-muted);
  cursor: not-allowed;
}

.mode__hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.mode__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  justify-content: center;
}
EOF
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/screens/ModeScreen.test.tsx && npm run lint && npm run typecheck
```

Ожидается: 7 тестов зелёные.

- [ ] **Step 5: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/screens/ModeScreen.tsx src/screens/ModeScreen.test.tsx src/styles/app.css
git commit -m "feat: add the mode screen with direction selection

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Экран тренировки

Самая крупная задача: здесь сходятся жесты, анимация ухода карточки и прогресс. Блокировка ввода на время анимации живёт именно тут — хук жестов про анимацию ничего не знает.

**Files:**
- Create: `src/components/SimpleProgress.tsx`, `src/components/RingProgress.tsx`, `src/components/Counters.tsx`, `src/screens/TrainingScreen.tsx`, `src/screens/TrainingScreen.test.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `Card` (компонент) из `@/components/Card`; `useSwipeGesture` из `@/hooks/useSwipeGesture`; `currentCardId`, `roundProgress`, `ringProgress` из `@/core/session`; `frontFace`, `backFace` из `@/core/deck`
- Produces:
  - `const EXIT_DURATION = 220`
  - компоненты `SimpleProgress({ done, total })`, `RingProgress({ blockIndex, blockCount })`, `Counters({ known, unknown })`, `TrainingScreen` без свойств

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/screens/TrainingScreen.test.tsx <<'EOF'
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainingScreen, { EXIT_DURATION } from '@/screens/TrainingScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import type { Card } from '@/core/deck';
import { createSession } from '@/core/session';

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function trainingState(mode: 'simple' | 'ring' = 'simple'): AppState {
  return {
    ...initialState,
    cards,
    hydrated: true,
    screen: 'training',
    startedMode: mode,
    session: createSession(['c1', 'c2'], mode),
  };
}

/** Проматывает анимацию ухода карточки. */
async function settle() {
  await act(async () => {
    vi.advanceTimersByTime(EXIT_DURATION + 10);
  });
}

describe('TrainingScreen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('показывает лицевую сторону текущей карточки', () => {
    renderWithProvider(<TrainingScreen />, trainingState());
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('кнопка «Знаю» переводит к следующей карточке', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TrainingScreen />, trainingState());

    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await settle();

    expect(screen.getByText('谢谢')).toBeInTheDocument();
    expect(screen.queryByText('你好')).not.toBeInTheDocument();
  });

  it('свайп вправо увеличивает счётчик «знаю»', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TrainingScreen />, trainingState());

    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await settle();

    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
    expect(screen.getByTestId('count-unknown')).toHaveTextContent('0');
  });

  it('«Изучать снова» увеличивает счётчик «не знаю»', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TrainingScreen />, trainingState());

    await user.click(screen.getByRole('button', { name: 'Изучать снова' }));
    await settle();

    expect(screen.getByTestId('count-unknown')).toHaveTextContent('1');
  });

  it('стрелка вправо работает как свайп', async () => {
    renderWithProvider(<TrainingScreen />, trainingState());
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    await settle();
    expect(screen.getByText('谢谢')).toBeInTheDocument();
  });

  it('во время анимации ввод заблокирован', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TrainingScreen />, trainingState());

    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await settle();

    // Второе нажатие не должно было засчитаться.
    expect(screen.getByTestId('count-known')).toHaveTextContent('1');
  });

  it('новая карточка показывается лицевой стороной', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TrainingScreen />, trainingState());

    await user.click(screen.getByRole('button', { name: 'Показать ответ' }));
    expect(screen.getByText('привет')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await settle();

    expect(screen.getByText('谢谢')).toBeInTheDocument();
    expect(screen.queryByText('спасибо')).not.toBeInTheDocument();
  });

  it('показывает прогресс круга в простом режиме', () => {
    renderWithProvider(<TrainingScreen />, trainingState('simple'));
    expect(screen.getByText('Круг 1 · осталось 2')).toBeInTheDocument();
  });

  it('показывает номер блока в режиме колец', () => {
    renderWithProvider(<TrainingScreen />, trainingState('ring'));
    expect(screen.getByText('Блок 1 из 1 · осталось 2')).toBeInTheDocument();
  });

  it('Esc предлагает выйти в меню', async () => {
    renderWithProvider(<TrainingScreen />, trainingState());
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.getByText('Выйти в меню? Прогресс тренировки будет потерян.')).toBeInTheDocument();
  });

  it('подтверждение выхода можно отменить', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider(<TrainingScreen />, trainingState());

    await user.click(screen.getByRole('button', { name: 'Закрыть тренировку' }));
    await user.click(screen.getByRole('button', { name: 'Остаться' }));

    expect(screen.queryByText('Выйти в меню? Прогресс тренировки будет потерян.')).not.toBeInTheDocument();
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('во время подтверждения свайпы не работают', async () => {
    renderWithProvider(<TrainingScreen />, trainingState());
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    // Отдельный act: обработчик клавиш переподписывается только после рендера.
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    await settle();
    expect(screen.getByText('你好')).toBeInTheDocument();
  });

  it('учитывает направление при отрисовке', () => {
    renderWithProvider(<TrainingScreen />, {
      ...trainingState(),
      direction: 'translation-to-hanzi',
    });
    expect(screen.getByText('привет')).toBeInTheDocument();
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/screens/TrainingScreen.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/screens/TrainingScreen"».

- [ ] **Step 3: Реализовать компоненты прогресса и счётчиков**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/components/SimpleProgress.tsx <<'EOF'
export default function SimpleProgress({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
    >
      <div className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
EOF
cat > src/components/RingProgress.tsx <<'EOF'
export default function RingProgress({
  blockIndex,
  blockCount,
}: {
  blockIndex: number;
  blockCount: number;
}) {
  return (
    <div className="segments" aria-hidden="true">
      {Array.from({ length: blockCount }, (_, index) => (
        <span
          key={index}
          className={index < blockIndex ? 'segment segment--done' : index === blockIndex ? 'segment segment--active' : 'segment'}
        />
      ))}
    </div>
  );
}
EOF
cat > src/components/Counters.tsx <<'EOF'
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
EOF
```

- [ ] **Step 4: Реализовать TrainingScreen.tsx**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/screens/TrainingScreen.tsx <<'EOF'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from '@/components/Card';
import Counters from '@/components/Counters';
import RingProgress from '@/components/RingProgress';
import SimpleProgress from '@/components/SimpleProgress';
import { backFace, frontFace } from '@/core/deck';
import { currentCardId, ringProgress, roundProgress } from '@/core/session';
import type { Session, SwipeDirection } from '@/core/session';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useAppDispatch, useAppState } from '@/state/AppContext';

/** Совпадает с длительностью перехода .card в app.css. */
export const EXIT_DURATION = 220;
const BANNER_DURATION = 1800;

export default function TrainingScreen() {
  const { cards, direction, session, stats } = useAppState();
  const dispatch = useAppDispatch();

  const [flipped, setFlipped] = useState(false);
  const [exiting, setExiting] = useState<SwipeDirection | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const exitTimer = useRef<number | null>(null);

  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const cardId = session === null ? null : currentCardId(session);
  const card = cardId === null ? undefined : byId.get(cardId);

  const commitSwipe = useCallback(
    (swipeDirection: SwipeDirection) => {
      // Пока карточка уезжает, второй свайп игнорируется.
      if (exitTimer.current !== null) return;
      setExiting(swipeDirection);
      exitTimer.current = window.setTimeout(() => {
        exitTimer.current = null;
        setExiting(null);
        setFlipped(false);
        dispatch({ type: 'swiped', direction: swipeDirection });
      }, EXIT_DURATION);
    },
    [dispatch],
  );

  const flip = useCallback(() => setFlipped((value) => !value), []);

  const { dragX, dragging, handlers } = useSwipeGesture({
    onSwipe: commitSwipe,
    onFlip: flip,
    disabled: exiting !== null || confirmExit,
  });

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setConfirmExit(true);
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(
    () => () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const stageKey = session === null ? '' : stageKeyOf(session);
  const [banner, setBanner] = useState('');
  const previousStage = useRef(stageKey);

  useEffect(() => {
    if (session === null || previousStage.current === stageKey) return;
    previousStage.current = stageKey;
    setBanner(stageLabel(session));
    const timer = window.setTimeout(() => setBanner(''), BANNER_DURATION);
    return () => window.clearTimeout(timer);
  }, [stageKey, session]);

  if (session === null || card === undefined) return null;

  return (
    <section className="screen screen--training">
      <header className="training__header">
        <button
          type="button"
          className="icon-btn"
          aria-label="Закрыть тренировку"
          onClick={() => setConfirmExit(true)}
        >
          ×
        </button>
        <p className="training__progress">{progressText(session)}</p>
      </header>

      {confirmExit && (
        <div className="training__confirm" role="dialog" aria-label="Выход из тренировки">
          <p>Выйти в меню? Прогресс тренировки будет потерян.</p>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'go-to-mode' })}>
            Выйти
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => setConfirmExit(false)}>
            Остаться
          </button>
        </div>
      )}

      {session.mode === 'simple' ? (
        <SimpleProgress {...roundProgress(session)} />
      ) : (
        <RingProgress {...ringProgress(session)} />
      )}

      <Counters known={stats.known} unknown={stats.unknown} />

      {banner !== '' && <p className="training__banner">{banner}</p>}

      <Card
        front={frontFace(card, direction)}
        back={backFace(card, direction)}
        flipped={flipped}
        dragX={dragX}
        dragging={dragging}
        exiting={exiting}
        handlers={handlers}
      />

      <div className="training__buttons">
        <button type="button" className="btn btn--quiet" onClick={flip}>
          {flipped ? 'Скрыть ответ' : 'Показать ответ'}
        </button>
        <button type="button" className="btn" onClick={() => commitSwipe('left')}>
          Изучать снова
        </button>
        <button type="button" className="btn" onClick={() => commitSwipe('right')}>
          Знаю
        </button>
      </div>

      <button
        type="button"
        className="link-button"
        onClick={() => dispatch({ type: 'go-to-import' })}
      >
        Загрузить новую таблицу
      </button>
    </section>
  );
}

function stageKeyOf(session: Session): string {
  return session.mode === 'ring'
    ? `ring-${session.blockIndex}`
    : `round-${session.round}-${String(session.finalRound)}`;
}

function stageLabel(session: Session): string {
  if (session.mode === 'ring') return `Блок ${session.blockIndex + 1}`;
  if (session.finalRound) return 'Сводный круг';
  return `Круг ${session.round}`;
}

function progressText(session: Session): string {
  if (session.mode === 'ring') {
    const { blockIndex, blockCount, remaining } = ringProgress(session);
    return `Блок ${blockIndex + 1} из ${blockCount} · осталось ${remaining}`;
  }
  const stage = session.finalRound ? 'Сводный круг' : `Круг ${session.round}`;
  return `${stage} · осталось ${session.queue.length}`;
}
EOF
cat >> src/styles/app.css <<'EOF'

.screen--training {
  justify-content: flex-start;
  padding-top: 2vh;
}

.training__header {
  display: flex;
  align-items: center;
  gap: var(--gap);
  width: var(--card-width);
}

.training__progress {
  margin: 0;
  color: var(--text-muted);
}

.icon-btn {
  font: inherit;
  font-size: 1.5rem;
  line-height: 1;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 50%;
  background: var(--surface-raised);
  color: var(--text);
  cursor: pointer;
}

.progress {
  width: var(--card-width);
  height: 6px;
  border-radius: 3px;
  background: var(--surface);
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background: var(--accent);
  transition: width 200ms ease;
}

.segments {
  display: flex;
  gap: 4px;
  width: var(--card-width);
}

.segment {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--surface);
}

.segment--done {
  background: var(--yes);
}

.segment--active {
  background: var(--accent);
}

.counters {
  display: flex;
  gap: var(--gap);
}

.counter {
  min-width: 2.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--surface);
  font-variant-numeric: tabular-nums;
}

.counter--yes {
  color: var(--yes);
}

.counter--no {
  color: var(--no);
}

.training__banner {
  margin: 0;
  color: var(--accent);
  font-size: 1.125rem;
}

.training__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  justify-content: center;
}

.training__confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--gap);
  padding: 0.75rem var(--gap);
  border-radius: var(--radius);
  background: var(--surface-raised);
}

.training__confirm p {
  margin: 0;
}
EOF
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/screens/TrainingScreen.test.tsx && npm run lint && npm run typecheck
```

Ожидается: 13 тестов зелёные.

- [ ] **Step 6: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/components src/screens/TrainingScreen.tsx src/screens/TrainingScreen.test.tsx src/styles/app.css
git commit -m "feat: add the training screen with progress and counters

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Возобновление, итоги и сборка приложения

После этой задачи приложение работает целиком: от вставки таблицы до экрана «Готово», с восстановлением после перезагрузки.

**Files:**
- Create: `src/screens/ResumeScreen.tsx`, `src/screens/DoneScreen.tsx`, `src/screens/ResumeScreen.test.tsx`, `src/App.test.tsx` (замена)
- Modify: `src/App.tsx`, `src/styles/app.css`

**Interfaces:**
- Consumes: все пять экранов; `usePersistence`, `browserStorage` из `@/hooks/usePersistence`; `AppProvider` из `@/state/AppContext`
- Produces: компонент `App` со свойством `{ storage?: StorageLike | null }` — свойство нужно тестам, приложение использует значение по умолчанию

- [ ] **Step 1: Написать падающие тесты**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/screens/ResumeScreen.test.tsx <<'EOF'
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeScreen from '@/screens/ResumeScreen';
import { renderWithProvider } from '@/test/render';
import { initialState } from '@/state/appReducer';
import type { AppState } from '@/state/appReducer';
import type { Card } from '@/core/deck';
import { createSession } from '@/core/session';

const cards: Card[] = [
  { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' },
  { id: 'c2', hanzi: '谢谢', pinyin: 'xièxie', translation: 'спасибо' },
];

function resumeState(mode: 'simple' | 'ring' = 'simple'): AppState {
  return {
    ...initialState,
    cards,
    hydrated: true,
    screen: 'resume',
    startedMode: mode,
    session: createSession(['c1', 'c2'], mode),
  };
}

describe('ResumeScreen', () => {
  it('описывает сохранённую сессию простого режима', () => {
    renderWithProvider(<ResumeScreen />, resumeState('simple'));
    expect(screen.getByText('2 карточки · Круг 1')).toBeInTheDocument();
  });

  it('описывает сохранённую сессию колец', () => {
    renderWithProvider(<ResumeScreen />, resumeState('ring'));
    expect(screen.getByText('2 карточки · Блок 1 из 1')).toBeInTheDocument();
  });

  it('загрузка новой таблицы требует подтверждения', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ResumeScreen />, resumeState());

    await user.click(screen.getByRole('button', { name: 'Загрузить новую' }));
    expect(screen.getByText('Прогресс текущей тренировки будет потерян.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Да, загрузить новую' })).toBeInTheDocument();
  });

  it('подтверждение можно отменить', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ResumeScreen />, resumeState());

    await user.click(screen.getByRole('button', { name: 'Загрузить новую' }));
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByRole('button', { name: 'Да, загрузить новую' })).not.toBeInTheDocument();
  });
});
EOF
cat > src/App.test.tsx <<'EOF'
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { EXIT_DURATION } from '@/screens/TrainingScreen';
import { STORAGE_KEY, STORAGE_VERSION } from '@/core/storage';
import type { StorageLike, StoredState } from '@/core/storage';

function memoryStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  const storage: StorageLike = {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
  return { storage, data };
}

const TABLE = '你好\tni3 hao3\tпривет\n谢谢\txie4xie5\tспасибо';

async function settle() {
  await act(async () => {
    vi.advanceTimersByTime(EXIT_DURATION + 10);
  });
}

describe('App: полный цикл', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('импорт таблицы ведёт на экран выбора режима', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste(TABLE);
    await user.click(screen.getByRole('button', { name: 'Создать колоду' }));

    expect(screen.getByRole('heading', { name: 'Колода готова: 2 карточки' })).toBeInTheDocument();
  });

  it('простой режим доходит до экрана итогов', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste(TABLE);
    await user.click(screen.getByRole('button', { name: 'Создать колоду' }));
    await user.click(screen.getByRole('button', { name: 'Простой просмотр' }));

    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await settle();
    await user.click(screen.getByRole('button', { name: 'Знаю' }));
    await settle();

    expect(screen.getByRole('heading', { name: 'Готово' })).toBeInTheDocument();
    expect(screen.getByText('Знаю: 2 · Не знаю: 0')).toBeInTheDocument();
  });

  it('сохранённая сессия приводит на экран возобновления', () => {
    const stored: StoredState = {
      version: STORAGE_VERSION,
      cards: [{ id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' }],
      direction: 'hanzi-to-translation',
      session: {
        mode: 'simple', round: 1, queue: ['c1'], nextRound: [],
        perfectRound: true, finalRound: false, finished: false,
      },
      stats: { known: 0, unknown: 0 },
    };
    const { storage } = memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) });
    render(<App storage={storage} />);

    expect(screen.getByRole('heading', { name: 'Продолжить тренировку?' })).toBeInTheDocument();
  });

  it('предупреждает, если прогресс не сохраняется', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    render(<App storage={failing} />);
    expect(screen.getByText('Прогресс не сохраняется: браузер не разрешает запись.')).toBeInTheDocument();
  });

  it('выбранное направление применяется к тренировке', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { storage } = memoryStorage();
    render(<App storage={storage} />);

    await user.click(screen.getByLabelText('Таблица со словами'));
    await user.paste(TABLE);
    await user.click(screen.getByRole('button', { name: 'Создать колоду' }));
    await user.click(screen.getByLabelText('Перевод → иероглиф'));
    await user.click(screen.getByRole('button', { name: 'Простой просмотр' }));

    expect(screen.getByText('привет')).toBeInTheDocument();
  });
});
EOF
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test -- src/App.test.tsx src/screens/ResumeScreen.test.tsx
```

Ожидается: FAIL — `@/screens/ResumeScreen` не разрешается, `App` не принимает свойство `storage`.

- [ ] **Step 3: Реализовать ResumeScreen.tsx**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/screens/ResumeScreen.tsx <<'EOF'
import { useState } from 'react';
import { plural } from '@/core/plural';
import type { Session } from '@/core/session';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function ResumeScreen() {
  const { cards, session } = useAppState();
  const dispatch = useAppDispatch();
  const [confirming, setConfirming] = useState(false);

  if (session === null) return null;

  return (
    <section className="screen">
      <h1>Продолжить тренировку?</h1>
      <p className="resume__info">
        {`${cards.length} ${plural(cards.length, ['карточка', 'карточки', 'карточек'])} · ${stageLabel(session)}`}
      </p>

      {confirming ? (
        <>
          <p className="resume__warning">Прогресс текущей тренировки будет потерян.</p>
          <div className="resume__buttons">
            <button
              type="button"
              className="btn"
              onClick={() => dispatch({ type: 'go-to-import' })}
            >
              Да, загрузить новую
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setConfirming(false)}>
              Отмена
            </button>
          </div>
        </>
      ) : (
        <div className="resume__buttons">
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: 'resume-confirmed' })}
          >
            Продолжить
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => setConfirming(true)}>
            Загрузить новую
          </button>
        </div>
      )}
    </section>
  );
}

function stageLabel(session: Session): string {
  if (session.mode === 'ring') {
    return `Блок ${session.blockIndex + 1} из ${session.blocks.length}`;
  }
  return session.finalRound ? 'Сводный круг' : `Круг ${session.round}`;
}
EOF
```

- [ ] **Step 4: Реализовать DoneScreen.tsx**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/screens/DoneScreen.tsx <<'EOF'
import { plural } from '@/core/plural';
import { useAppDispatch, useAppState } from '@/state/AppContext';

export default function DoneScreen() {
  const { cards, stats, startedMode } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <section className="screen">
      <h1>Готово</h1>
      <p className="done__info">
        {`${cards.length} ${plural(cards.length, ['карточка', 'карточки', 'карточек'])}`}
      </p>
      <p className="done__stats">{`Знаю: ${stats.known} · Не знаю: ${stats.unknown}`}</p>

      <div className="done__buttons">
        <button
          type="button"
          className="btn"
          onClick={() => dispatch({ type: 'session-started', mode: startedMode })}
        >
          Начать заново
        </button>
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => dispatch({ type: 'go-to-mode' })}
        >
          В меню
        </button>
      </div>
    </section>
  );
}
EOF
```

- [ ] **Step 5: Собрать App.tsx**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/App.tsx <<'EOF'
import type { StorageLike } from '@/core/storage';
import { browserStorage, usePersistence } from '@/hooks/usePersistence';
import DoneScreen from '@/screens/DoneScreen';
import ImportScreen from '@/screens/ImportScreen';
import ModeScreen from '@/screens/ModeScreen';
import ResumeScreen from '@/screens/ResumeScreen';
import TrainingScreen from '@/screens/TrainingScreen';
import { AppProvider, useAppDispatch, useAppState } from '@/state/AppContext';
import type { Screen } from '@/state/appReducer';

/** `storage` переопределяют только тесты; приложение берёт localStorage. */
export default function App({ storage = browserStorage() }: { storage?: StorageLike | null }) {
  return (
    <AppProvider>
      <Screens storage={storage} />
    </AppProvider>
  );
}

function Screens({ storage }: { storage: StorageLike | null }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  usePersistence(state, dispatch, storage);

  // Пока хранилище не прочитано, показывать нечего: иначе на мгновение
  // мелькнёт экран импорта поверх сохранённой сессии.
  if (!state.hydrated) return null;

  return (
    <>
      {state.storageFailed && (
        <p className="warning" role="status">
          Прогресс не сохраняется: браузер не разрешает запись.
        </p>
      )}
      {renderScreen(state.screen)}
    </>
  );
}

function renderScreen(screen: Screen) {
  switch (screen) {
    case 'resume':
      return <ResumeScreen />;
    case 'import':
      return <ImportScreen />;
    case 'mode':
      return <ModeScreen />;
    case 'training':
      return <TrainingScreen />;
    case 'done':
      return <DoneScreen />;
  }
}
EOF
cat >> src/styles/app.css <<'EOF'

.warning {
  margin: 0;
  padding: 0.5rem var(--gap);
  background: var(--no);
  color: var(--bg);
  text-align: center;
}

.resume__info,
.resume__warning,
.done__info,
.done__stats {
  margin: 0;
  color: var(--text-muted);
}

.resume__buttons,
.done__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  justify-content: center;
}
EOF
```

- [ ] **Step 6: Убедиться, что весь набор тестов проходит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test && npm run lint && npm run typecheck && npm run build
```

Ожидается: все файлы тестов зелёные, сборка проходит.

- [ ] **Step 7: Проверить приложение вручную**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run dev
```

Откройте показанный адрес и пройдите сценарий: вставьте `你好\tni3 hao3\tпривет` (три колонки через табуляцию), создайте колоду, выберите «Иероглиф → перевод», запустите «Простой просмотр», переверните карточку кликом, свайпните мышью вправо. Затем перезагрузите страницу посреди тренировки и убедитесь, что предлагается продолжить. Остановите сервер по Ctrl+C.

- [ ] **Step 8: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add src/screens/ResumeScreen.tsx src/screens/ResumeScreen.test.tsx src/screens/DoneScreen.tsx src/App.tsx src/App.test.tsx src/styles/app.css
git commit -m "feat: wire up all screens into a working application

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: Офлайн-режим

`registerType: 'prompt'`, а не `autoUpdate`: тихое обновление перезагружает страницу, а перезагрузка посреди урока — это прерванное занятие.

**Files:**
- Create: `public/icon.svg`, `scripts/make-icons.mjs`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `src/components/UpdatePrompt.tsx`, `src/components/UpdatePrompt.test.tsx`
- Modify: `vite.config.ts`, `src/vite-env.d.ts`, `src/App.tsx`, `src/styles/app.css`, `package.json`

**Interfaces:**
- Consumes: `useRegisterSW` из `virtual:pwa-register/react`
- Produces: компонент `UpdatePrompt` без свойств; скрипт `npm run icons`

- [ ] **Step 1: Установить зависимости и нарисовать иконку**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm install -D vite-plugin-pwa sharp
mkdir -p public scripts
cat > public/icon.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0a092d"/>
  <rect x="96" y="128" width="320" height="256" rx="32" fill="#2e3856"/>
  <text x="256" y="300" font-family="PingFang SC, Noto Sans SC, sans-serif"
        font-size="160" fill="#f6f7fb" text-anchor="middle">汉</text>
</svg>
EOF
```

- [ ] **Step 2: Сгенерировать PNG-иконки**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > scripts/make-icons.mjs <<'EOF'
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = await readFile(new URL('../public/icon.svg', import.meta.url));

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  // maskable: платформа обрезает края, поэтому рисунок ужимается внутрь.
  { file: 'icon-maskable-512.png', size: 512, padding: 64 },
];

for (const { file, size, padding } of targets) {
  const inner = size - padding * 2;
  const image = await sharp(source, { density: 512 })
    .resize(inner, inner)
    .extend({
      top: padding, bottom: padding, left: padding, right: padding,
      background: '#0a092d',
    })
    .png()
    .toBuffer();
  await writeFile(new URL(`../public/${file}`, import.meta.url), image);
  console.log(`wrote public/${file}`);
}
EOF
npm pkg set scripts.icons="node scripts/make-icons.mjs"
npm run icons
ls -la public/*.png
```

Ожидается: три PNG-файла созданы.

- [ ] **Step 3: Подключить vite-plugin-pwa**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > vite.config.ts <<'EOF'
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Пуст везде, кроме публикации: DEPLOY_BASE выставляет только job деплоя.
  base: process.env.DEPLOY_BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      // 'prompt', а не 'autoUpdate': тихая перезагрузка прервала бы урок.
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Карточки 汉字',
        short_name: '汉字',
        description: 'Карточки для заучивания китайских слов',
        lang: 'ru',
        display: 'standalone',
        background_color: '#0a092d',
        theme_color: '#0a092d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
EOF
cat > src/vite-env.d.ts <<'EOF'
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
EOF
```

- [ ] **Step 4: Написать падающий тест уведомления**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/components/UpdatePrompt.test.tsx <<'EOF'
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdatePrompt from '@/components/UpdatePrompt';

const updateServiceWorker = vi.fn();
let needRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

describe('UpdatePrompt', () => {
  beforeEach(() => {
    needRefresh = false;
    updateServiceWorker.mockClear();
  });

  it('молчит, пока новой версии нет', () => {
    render(<UpdatePrompt />);
    expect(screen.queryByText('Доступна новая версия')).not.toBeInTheDocument();
  });

  it('предлагает обновиться, когда версия готова', async () => {
    needRefresh = true;
    const user = userEvent.setup();
    render(<UpdatePrompt />);

    expect(screen.getByText('Доступна новая версия')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Обновить' }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
EOF
npm run test -- src/components/UpdatePrompt.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "@/components/UpdatePrompt"».

- [ ] **Step 5: Реализовать UpdatePrompt и подключить его**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > src/components/UpdatePrompt.tsx <<'EOF'
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-prompt" role="status">
      <span>Доступна новая версия</span>
      <button type="button" className="btn" onClick={() => void updateServiceWorker(true)}>
        Обновить
      </button>
    </div>
  );
}
EOF
python3 - <<'PY'
import io
p = 'src/App.tsx'
s = io.open(p, encoding='utf-8').read()
s = s.replace(
  "import type { StorageLike } from '@/core/storage';",
  "import UpdatePrompt from '@/components/UpdatePrompt';\nimport type { StorageLike } from '@/core/storage';",
)
s = s.replace(
  "  return (\n    <>\n      {state.storageFailed && (",
  "  return (\n    <>\n      <UpdatePrompt />\n      {state.storageFailed && (",
)
io.open(p, 'w', encoding='utf-8').write(s)
PY
cat >> src/styles/app.css <<'EOF'

.update-prompt {
  position: fixed;
  inset: auto 1rem 1rem auto;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: var(--gap);
  padding: 0.75rem var(--gap);
  border-radius: var(--radius);
  background: var(--surface-raised);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.4);
}
EOF
```

`App.test.tsx` тоже рендерит `UpdatePrompt`, поэтому виртуальный модуль нужно замокать и там.

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
python3 - <<'PY'
import io
p = 'src/App.test.tsx'
s = io.open(p, encoding='utf-8').read()
mock = """
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));
"""
s = s.replace("const TABLE =", mock + "\nconst TABLE =")
io.open(p, 'w', encoding='utf-8').write(s)
PY
```

- [ ] **Step 6: Проверить тесты и сборку**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test && npm run lint && npm run typecheck && npm run build
ls dist/sw.js dist/manifest.webmanifest
```

Ожидается: все тесты зелёные, `dist/sw.js` и `dist/manifest.webmanifest` существуют.

- [ ] **Step 7: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add public scripts vite.config.ts package.json src/vite-env.d.ts src/components/UpdatePrompt.tsx src/components/UpdatePrompt.test.tsx src/App.tsx src/App.test.tsx src/styles/app.css
git commit -m "feat: make the app installable and usable offline

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 17: Сквозной тест

Ровно один сценарий. Он ловит то, чего не видят тесты уровнями ниже: поломку сборки, неверные пути к ассетам и незарегистрированный service worker. Больше сквозных тестов на этом этапе не пишем — они дороги в поддержке и дублируют уже покрытое.

**Files:**
- Create: `playwright.config.ts`, `e2e/training.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: собранное приложение через `npm run preview`
- Produces: команда `npm run test:e2e`

- [ ] **Step 1: Установить Playwright**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Настроить Playwright**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > playwright.config.ts <<'EOF'
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 1 : 0,
  use: { baseURL: 'http://localhost:4173' },
  // Тест идёт по собранному приложению: только так проверяются пути и service worker.
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120_000,
  },
});
EOF
```

- [ ] **Step 3: Написать сценарий**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
mkdir -p e2e
cat > e2e/training.spec.ts <<'EOF'
import { expect, test } from '@playwright/test';

const WORDS = [
  ['你好', 'ni3 hao3', 'привет'],
  ['谢谢', 'xie4xie5', 'спасибо'],
  ['再见', 'zai4jian4', 'до свидания'],
  ['老师', 'lao3shi1', 'учитель'],
  ['学生', 'xue2sheng5', 'ученик'],
  ['中国', 'zhong1guo2', 'Китай'],
  ['学习', 'xue2xi2', 'учиться'],
  ['汉语', 'han4yu3', 'китайский язык'],
];
const TABLE = WORDS.map((row) => row.join('\t')).join('\n');

// Восемь карточек — это блок из семи плюс короткий блок из одной,
// то есть проверяются и переход между блоками, и неполный последний блок.
const RING_SWIPES = WORDS.length;
const FINAL_ROUND_SWIPES = WORDS.length;
const TOTAL = RING_SWIPES + FINAL_ROUND_SWIPES;

test('режим колец проходится до экрана итогов', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Таблица со словами').fill(TABLE);
  await expect(page.getByText('Добавлено 8 карточек')).toBeVisible();

  await page.getByRole('button', { name: 'Создать колоду' }).click();
  await expect(page.getByRole('heading', { name: 'Колода готова: 8 карточек' })).toBeVisible();

  await page.getByRole('button', { name: 'Заучивание кольцами по 7' }).click();
  await expect(page.getByText('Блок 1 из 2 · осталось 7')).toBeVisible();

  const know = page.getByRole('button', { name: 'Знаю' });
  for (let done = 1; done < TOTAL; done += 1) {
    await know.click();
    // Ждём счётчик, а не таймер: так тест не зависит от длительности анимации.
    await expect(page.getByTestId('count-known')).toHaveText(String(done));
  }
  await know.click();

  await expect(page.getByRole('heading', { name: 'Готово' })).toBeVisible();
  await expect(page.getByText('Знаю: 16 · Не знаю: 0')).toBeVisible();
});

test('пиньинь показан с диакритикой', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Таблица со словами').fill(TABLE);
  await expect(page.getByText('nǐ hǎo')).toBeVisible();
});

test('service worker собран и отдаётся', async ({ request }) => {
  const response = await request.get('/sw.js');
  expect(response.status()).toBe(200);
});
EOF
```

- [ ] **Step 4: Прогнать сквозной тест**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run test:e2e
```

Ожидается: `3 passed`.

- [ ] **Step 5: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add playwright.config.ts e2e package.json package-lock.json
git commit -m "test: add an end-to-end run through the ring mode

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 18: CI и публикация

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: команды `lint`, `typecheck`, `test`, `build`, `test:e2e`
- Produces: проверку на каждый pull request и публикацию `master` на GitHub Pages

- [ ] **Step 1: Написать workflow проверок**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'EOF'
name: CI

on:
  pull_request:
  push:
    branches: [master]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
EOF
```

- [ ] **Step 2: Написать workflow публикации**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > .github/workflows/deploy.yml <<'EOF'
name: Deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          # Единственное место, где base отличается от корня.
          DEPLOY_BASE: /hanzi-cards/
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
EOF
```

- [ ] **Step 3: Проверить, что сборка с DEPLOY_BASE даёт правильные пути**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
DEPLOY_BASE=/hanzi-cards/ npm run build
grep -o 'src="[^"]*"' dist/index.html
```

Ожидается: пути начинаются с `/hanzi-cards/assets/`, а не с `/assets/`.

- [ ] **Step 4: Коммит и отправка**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add .github
git commit -m "ci: check every change and publish master to GitHub Pages

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push -u origin master
```

Если удалённого репозитория ещё нет, создайте его под именем `hanzi-cards` и отправьте ветку:

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
gh repo create hanzi-cards --private --source=. --remote=origin --push
```

- [ ] **Step 5: Включить GitHub Pages**

В настройках репозитория на GitHub откройте Settings → Pages и в поле Source выберите **GitHub Actions**. Без этого шага job публикации завершается ошибкой «Pages is not enabled». Затем убедитесь, что оба workflow прошли:

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
gh run list --limit 4
```

Ожидается: CI и Deploy со статусом `completed success`.

---

### Task 19: Удаление прототипа

Прототип сохранён тегом `prototype` из Task 1, поэтому удаление безопасно и обратимо.

**Files:**
- Delete: `main.js`, `deck.js`, `deck.test.js`
- Create: `README.md`

**Interfaces:**
- Consumes: ничего
- Produces: чистое дерево репозитория

- [ ] **Step 1: Убедиться, что на старые файлы никто не ссылается**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
grep -rn "deck\.js\|main\.js" --include='*.ts' --include='*.tsx' --include='*.html' --include='*.json' \
  src index.html package.json || echo "ссылок нет"
```

Ожидается: «ссылок нет».

- [ ] **Step 2: Удалить файлы прототипа**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git rm main.js deck.js deck.test.js
```

- [ ] **Step 3: Написать README**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
cat > README.md <<'EOF'
# Карточки 汉字

Веб-приложение для заучивания китайских слов на уроке. Преподаватель вставляет
таблицу «иероглиф — пиньинь — перевод», выбирает направление вопроса и режим
тренировки, а дальше листает карточки свайпом.

Приложение работает офлайн и ставится на рабочий стол как PWA.

## Разработка

```bash
npm install
npm run dev
```

| Команда | Что делает |
|---------|-----------|
| `npm run dev` | Локальный сервер разработки |
| `npm run build` | Сборка в `dist` |
| `npm run preview` | Просмотр собранного приложения |
| `npm run test` | Юнит-тесты и тесты компонентов |
| `npm run test:e2e` | Сквозной тест в браузере |
| `npm run lint` | ESLint |
| `npm run typecheck` | Проверка типов |
| `npm run icons` | Перегенерация иконок из `public/icon.svg` |

## Устройство

- `src/core` — чистая логика: разбор таблицы, пиньинь, машина состояний
  тренировки, хранилище. Не импортирует React и не трогает DOM; это правило
  проверяется ESLint.
- `src/state` — редьюсер и контекст.
- `src/screens`, `src/components`, `src/hooks` — слой представления.

## Документы

- [Спецификация Этапа 0](docs/superpowers/specs/2026-09-12-hanzi-cards-stage0-design.md)
- [План Этапа 0](docs/superpowers/plans/2026-09-12-hanzi-cards-stage0.md)

Прототип на vanilla JS, с которого всё начиналось, доступен по тегу `prototype`.
EOF
```

- [ ] **Step 4: Прогнать всё целиком**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e
```

Ожидается: всё зелёное.

- [ ] **Step 5: Пройти критерии готовности из спека**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
grep -rn "from 'react'\|window\.\|document\." src/core --include='*.ts' | grep -v '\.test\.ts' || echo "критерий 9 выполнен"
```

Затем откройте опубликованный адрес и проверьте вручную то, что не проверяется командами:

1. Страница открывается по адресу GitHub Pages и предлагает установку как приложение.
2. После установки и выключения сети приложение открывается и работает.
3. Таблица в две колонки с запятыми внутри перевода импортируется без потерь.
4. Для колоды без пиньиня направление «Иероглиф → пиньинь» выключено.
5. Перезагрузка посреди тренировки восстанавливает карточку, круг, счётчики и направление.

- [ ] **Step 6: Коммит**

```bash
cd "$HOME/Documents/Projects/hanzi-cards"
git add -A
git commit -m "chore: remove the vanilla prototype and document the project

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

---

## Соответствие спеку

| Раздел спека | Задачи |
|--------------|--------|
| Архитектура, три слоя | 2, 3–7 (core), 8 (state), 10–15 (представление) |
| Модель данных, `Card` и `Direction` | 3 |
| Стороны карточки по направлению | 3, 10 |
| Импорт: разделитель, колонки, заголовок, пропуск, склейка | 5 |
| Импорт: превью и переключатель колонок | 12 |
| Импорт из файла | 12 |
| Нормализация пиньиня | 4 |
| Машина состояний, оба режима, сводный круг | 6 |
| Счётчики, сохраняемые между кругами | 8, 14 |
| Хранилище: ключ, версия, валидация, отказ записи | 7, 9 |
| Пять экранов | 12, 13, 14, 15 |
| Типографика и масштабирование от высоты окна | 10 |
| Жесты: указатель, клавиатура, кнопки, блокировка | 11, 14 |
| Выход по Esc с подтверждением | 14 |
| PWA, манифест, уведомление об обновлении | 16 |
| Тесты Vitest на core | 3–7 |
| Тесты React Testing Library | 10, 12, 13, 14, 15 |
| Один сквозной тест Playwright | 17 |
| CI и публикация | 18 |
| Подготовительные шаги: merge и переименование | 1 |
| Удаление прототипа | 19 |
| Критерий «core без React и DOM» | 2 (правило ESLint), 7, 19 |
