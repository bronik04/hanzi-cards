# Карточки для заучивания слов — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-folder, dependency-free HTML/CSS/JS app that turns a pasted word/translation table into a flashcard deck with two swipe-based training modes ("Простой просмотр" and "Кольца по 7"), persisted in localStorage.

**Architecture:** Pure game logic (parsing, deck/session state transitions) lives in a dependency-free UMD module (`deck.js`) that is unit-tested with Node's built-in test runner. A separate DOM-glue script (`main.js`) wires that logic to a static `index.html` (screens shown/hidden via a `hidden` attribute), handling rendering, pointer/keyboard swipe gestures, and localStorage persistence. Classic (non-module) `<script>` tags are used throughout so the app opens directly via `file://` with no local server and no build step.

**Tech Stack:** Plain HTML5, CSS3, ES5-compatible vanilla JavaScript. No frameworks, no bundler, no npm dependencies. Node.js is used only as the test runner for `deck.js` (`node --test`), never shipped to the browser.

## Global Constraints

- No build tools, bundlers, or frameworks — plain HTML/CSS/JS only, spec section "Архитектура".
- No external dependencies or CDN libraries.
- The app must be usable by opening `index.html` directly via `file://` (double-click) — this rules out `type="module"` scripts (blocked by CORS on `file://`); use classic scripts + a UMD wrapper for `deck.js` instead.
- Node.js 18 or later is required only to run `deck.js`'s automated tests (`node --test`), never to run the app itself.
- All user-facing text is in Russian.
- localStorage key for all persisted state: `flashcards.state.v1`, spec section "Хранение".
- Deck cards have exactly two fields: `front` (слово) and `back` (перевод), spec section "Ввод данных".
- Ring/block size is fixed at 7 cards, spec section "Режим «Заучивание кольцами по 7»".
- Swipe drag-commit threshold: 80px, spec section "Взаимодействие (свайп)".

## File Structure

- `deck.js` — pure logic, no DOM access. UMD module exposing `window.Deck` in the browser and `module.exports` in Node. Contains table parsing and the two training modes' state machines. (Tasks 1–3)
- `deck.test.js` — Node test-runner (`node:test` + `node:assert/strict`) unit tests for every function in `deck.js`. (Tasks 1–3)
- `index.html` — all screen markup (resume prompt, table input, mode selection, training, done) plus inline `<style>`. Loads `deck.js` then `main.js` as classic scripts. (Task 4)
- `main.js` — DOM glue: screen navigation, input parsing, mode selection, card rendering/flip, swipe gesture handling (pointer + keyboard + buttons), localStorage persistence. (Tasks 5–9)

---

### Task 1: Table parsing (`Deck.parseTable`)

**Files:**
- Create: `deck.js`
- Create: `deck.test.js`

**Interfaces:**
- Produces: `Deck.parseTable(text: string) -> { cards: Array<{front: string, back: string}>, addedCount: number, skippedCount: number }`

- [ ] **Step 1: Write the failing tests**

Create `deck.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Deck = require('./deck.js');

test('parseTable parses comma-separated pairs', () => {
  const result = Deck.parseTable('кошка,cat\nсобака,dog');
  assert.deepEqual(result.cards, [
    { front: 'кошка', back: 'cat' },
    { front: 'собака', back: 'dog' }
  ]);
  assert.equal(result.addedCount, 2);
  assert.equal(result.skippedCount, 0);
});

test('parseTable detects tab delimiter', () => {
  const result = Deck.parseTable('кошка\tcat\nсобака\tdog');
  assert.deepEqual(result.cards, [
    { front: 'кошка', back: 'cat' },
    { front: 'собака', back: 'dog' }
  ]);
});

test('parseTable detects semicolon delimiter', () => {
  const result = Deck.parseTable('кошка;cat\nсобака;dog');
  assert.deepEqual(result.cards, [
    { front: 'кошка', back: 'cat' },
    { front: 'собака', back: 'dog' }
  ]);
});

test('parseTable skips a recognized header row', () => {
  const result = Deck.parseTable('слово,перевод\nкошка,cat');
  assert.deepEqual(result.cards, [{ front: 'кошка', back: 'cat' }]);
  assert.equal(result.addedCount, 1);
  assert.equal(result.skippedCount, 0);
});

test('parseTable counts blank and malformed lines as skipped', () => {
  const result = Deck.parseTable('кошка,cat\n\nсобака,dog,extra\nптица,bird');
  assert.deepEqual(result.cards, [
    { front: 'кошка', back: 'cat' },
    { front: 'птица', back: 'bird' }
  ]);
  assert.equal(result.addedCount, 2);
  assert.equal(result.skippedCount, 2);
});

test('parseTable returns an empty result for blank input', () => {
  const result = Deck.parseTable('   \n  ');
  assert.deepEqual(result.cards, []);
  assert.equal(result.addedCount, 0);
  assert.equal(result.skippedCount, 0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test deck.test.js`
Expected: FAIL — `Cannot find module './deck.js'` (file does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `deck.js`:

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Deck = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HEADER_FRONT = /^(слово|word|term)$/i;
  var HEADER_BACK = /^(перевод|translation)$/i;
  var DEFAULT_BLOCK_SIZE = 7;

  function detectDelimiter(line) {
    if (line.indexOf('\t') !== -1) return '\t';
    if (line.indexOf(';') !== -1) return ';';
    return ',';
  }

  function splitLine(line, delimiter) {
    return line.split(delimiter).map(function (part) {
      return part.trim();
    });
  }

  function parseTable(text) {
    var rawLines = String(text).replace(/\r\n/g, '\n').split('\n');

    var firstNonEmpty = null;
    for (var i = 0; i < rawLines.length; i++) {
      if (rawLines[i].trim() !== '') {
        firstNonEmpty = rawLines[i];
        break;
      }
    }
    if (firstNonEmpty === null) {
      return { cards: [], addedCount: 0, skippedCount: 0 };
    }

    var delimiter = detectDelimiter(firstNonEmpty);
    var lines = rawLines.slice();

    var headerCols = splitLine(firstNonEmpty, delimiter);
    if (headerCols.length === 2 && HEADER_FRONT.test(headerCols[0]) && HEADER_BACK.test(headerCols[1])) {
      lines.splice(lines.indexOf(firstNonEmpty), 1);
    }

    var cards = [];
    var skippedCount = 0;

    lines.forEach(function (line) {
      if (line.trim() === '') {
        skippedCount++;
        return;
      }
      var cols = splitLine(line, delimiter);
      if (cols.length !== 2 || cols[0] === '' || cols[1] === '') {
        skippedCount++;
        return;
      }
      cards.push({ front: cols[0], back: cols[1] });
    });

    return { cards: cards, addedCount: cards.length, skippedCount: skippedCount };
  }

  return {
    parseTable: parseTable
  };
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test deck.test.js`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add deck.js deck.test.js
git commit -m "feat: add table parsing logic"
```

---

### Task 2: Deck blocks and session creation

**Files:**
- Modify: `deck.js`
- Modify: `deck.test.js`

**Interfaces:**
- Consumes: nothing new from Task 1 (parseTable is not used here).
- Produces:
  - `Deck.splitIntoBlocks(cards: Array<card>, blockSize: number) -> Array<Array<card>>`
  - `Deck.createSession(deck: Array<card>, mode: 'simple'|'ring') -> sessionState`
  - Simple session shape: `{ mode: 'simple', round: number, queue: Array<card>, nextRound: Array<card>, perfectRound: boolean, finished: boolean }`
  - Ring session shape: `{ mode: 'ring', allBlocks: Array<Array<card>>, blockIndex: number, queue: Array<card>, finished: boolean }`

- [ ] **Step 1: Write the failing tests**

Append to `deck.test.js` (after the existing `parseTable` tests):

```js

test('splitIntoBlocks splits into chunks of 7 with a shorter last block', () => {
  const cards = Array.from({ length: 10 }, (_, i) => ({ front: String(i), back: String(i) }));
  const blocks = Deck.splitIntoBlocks(cards, 7);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].length, 7);
  assert.equal(blocks[1].length, 3);
});

test('splitIntoBlocks returns one block when the deck is smaller than the block size', () => {
  const cards = [{ front: 'a', back: 'b' }];
  const blocks = Deck.splitIntoBlocks(cards, 7);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].length, 1);
});

test('createSession builds a simple-mode session over the full deck', () => {
  const deck = [{ front: 'a', back: 'b' }, { front: 'c', back: 'd' }];
  const session = Deck.createSession(deck, 'simple');
  assert.equal(session.mode, 'simple');
  assert.equal(session.round, 1);
  assert.deepEqual(session.queue, deck);
  assert.deepEqual(session.nextRound, []);
  assert.equal(session.finished, false);
});

test('createSession builds a ring-mode session with blocks of 7', () => {
  const deck = Array.from({ length: 9 }, (_, i) => ({ front: String(i), back: String(i) }));
  const session = Deck.createSession(deck, 'ring');
  assert.equal(session.mode, 'ring');
  assert.equal(session.blockIndex, 0);
  assert.equal(session.allBlocks.length, 2);
  assert.equal(session.queue.length, 7);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test deck.test.js`
Expected: FAIL — `Deck.splitIntoBlocks is not a function`.

- [ ] **Step 3: Write the implementation**

In `deck.js`, add `splitIntoBlocks` and `createSession` inside the factory function (after `parseTable`, before the `return` statement), and add both to the returned object:

```js
  function splitIntoBlocks(cards, blockSize) {
    var size = blockSize || DEFAULT_BLOCK_SIZE;
    var blocks = [];
    for (var i = 0; i < cards.length; i += size) {
      blocks.push(cards.slice(i, i + size));
    }
    return blocks;
  }

  function createSession(deck, mode) {
    if (mode === 'ring') {
      var blocks = splitIntoBlocks(deck, DEFAULT_BLOCK_SIZE);
      return {
        mode: 'ring',
        allBlocks: blocks,
        blockIndex: 0,
        queue: blocks.length > 0 ? blocks[0].slice() : [],
        finished: blocks.length === 0
      };
    }
    return {
      mode: 'simple',
      round: 1,
      queue: deck.slice(),
      nextRound: [],
      perfectRound: true,
      finished: deck.length === 0
    };
  }
```

Update the returned object at the bottom of the factory to:

```js
  return {
    parseTable: parseTable,
    splitIntoBlocks: splitIntoBlocks,
    createSession: createSession
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test deck.test.js`
Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add deck.js deck.test.js
git commit -m "feat: add deck block splitting and session creation"
```

---

### Task 3: Swipe state machine (`Deck.swipe`)

**Files:**
- Modify: `deck.js`
- Modify: `deck.test.js`

**Interfaces:**
- Consumes: session shapes and `createSession` from Task 2.
- Produces: `Deck.swipe(session: sessionState, direction: 'left'|'right') -> sessionState`

This is the core rule from the spec: swipe right removes the current card from the front of the queue; swipe left moves it to the back of the same queue. In simple mode, a round ends (and cards move to the next round) only via right-swipes, so a round finishes as `finished: true` exactly when it completes with zero left-swipes ("perfect round"); otherwise a new round starts over the same cards (now reordered by how many times each was left-swiped). In ring mode, a block ends as soon as every one of its cards has gone right once; the final block's completion starts a simple-mode session over the whole deck as the final review pass.

- [ ] **Step 1: Write the failing tests**

Append to `deck.test.js`:

```js

test('simple mode: swiping right on every card in a round finishes the session', () => {
  let session = Deck.createSession([{ front: 'a', back: '1' }, { front: 'b', back: '2' }], 'simple');
  session = Deck.swipe(session, 'right');
  assert.equal(session.finished, false);
  assert.equal(session.queue.length, 1);
  session = Deck.swipe(session, 'right');
  assert.equal(session.finished, true);
});

test('simple mode: swiping left requeues the card and starts a new round without finishing', () => {
  let session = Deck.createSession([{ front: 'a', back: '1' }, { front: 'b', back: '2' }], 'simple');
  session = Deck.swipe(session, 'left');
  assert.equal(session.queue.length, 2);
  assert.equal(session.queue[0].front, 'b');
  session = Deck.swipe(session, 'right');
  session = Deck.swipe(session, 'right');
  assert.equal(session.finished, false);
  assert.equal(session.round, 2);
  assert.equal(session.queue.length, 2);
});

test('ring mode: finishing a block advances to the next block', () => {
  const deck = Array.from({ length: 8 }, (_, i) => ({ front: String(i), back: String(i) }));
  let session = Deck.createSession(deck, 'ring');
  for (let i = 0; i < 7; i++) {
    session = Deck.swipe(session, 'right');
  }
  assert.equal(session.mode, 'ring');
  assert.equal(session.blockIndex, 1);
  assert.equal(session.queue.length, 1);
});

test('ring mode: finishing the last block starts a simple-mode final review over the full deck', () => {
  const deck = Array.from({ length: 8 }, (_, i) => ({ front: String(i), back: String(i) }));
  let session = Deck.createSession(deck, 'ring');
  for (let i = 0; i < 8; i++) {
    session = Deck.swipe(session, 'right');
  }
  assert.equal(session.mode, 'simple');
  assert.equal(session.round, 1);
  assert.equal(session.queue.length, 8);
  assert.equal(session.finished, false);
});

test('swipe is a no-op once the session is finished', () => {
  let session = Deck.createSession([{ front: 'a', back: '1' }], 'simple');
  session = Deck.swipe(session, 'right');
  assert.equal(session.finished, true);
  const after = Deck.swipe(session, 'right');
  assert.deepEqual(after, session);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test deck.test.js`
Expected: FAIL — `Deck.swipe is not a function`.

- [ ] **Step 3: Write the implementation**

In `deck.js`, add `simpleSwipe`, `ringSwipe`, and `swipe` inside the factory function (after `createSession`, before the `return` statement):

```js
  function simpleSwipe(state, direction) {
    var queue = state.queue.slice();
    var nextRound = state.nextRound.slice();
    var perfectRound = state.perfectRound;
    var current = queue.shift();

    if (direction === 'right') {
      nextRound.push(current);
    } else {
      queue.push(current);
      perfectRound = false;
    }

    if (queue.length === 0) {
      if (perfectRound) {
        return { mode: 'simple', round: state.round, queue: [], nextRound: [], perfectRound: true, finished: true };
      }
      return { mode: 'simple', round: state.round + 1, queue: nextRound, nextRound: [], perfectRound: true, finished: false };
    }

    return { mode: 'simple', round: state.round, queue: queue, nextRound: nextRound, perfectRound: perfectRound, finished: false };
  }

  function ringSwipe(state, direction) {
    var queue = state.queue.slice();
    var current = queue.shift();

    if (direction === 'left') {
      queue.push(current);
    }

    if (queue.length === 0) {
      var nextBlockIndex = state.blockIndex + 1;
      if (nextBlockIndex < state.allBlocks.length) {
        return {
          mode: 'ring',
          allBlocks: state.allBlocks,
          blockIndex: nextBlockIndex,
          queue: state.allBlocks[nextBlockIndex].slice(),
          finished: false
        };
      }
      var fullDeck = [];
      state.allBlocks.forEach(function (block) {
        fullDeck = fullDeck.concat(block);
      });
      return createSession(fullDeck, 'simple');
    }

    return {
      mode: 'ring',
      allBlocks: state.allBlocks,
      blockIndex: state.blockIndex,
      queue: queue,
      finished: false
    };
  }

  function swipe(state, direction) {
    if (state.finished) return state;
    if (state.mode === 'ring') return ringSwipe(state, direction);
    return simpleSwipe(state, direction);
  }
```

Update the returned object at the bottom of the factory to:

```js
  return {
    parseTable: parseTable,
    splitIntoBlocks: splitIntoBlocks,
    createSession: createSession,
    swipe: swipe
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test deck.test.js`
Expected: PASS — all 15 tests green.

- [ ] **Step 5: Commit**

```bash
git add deck.js deck.test.js
git commit -m "feat: add swipe state machine for simple and ring modes"
```

---

### Task 4: HTML skeleton and styling

**Files:**
- Create: `index.html`

**Interfaces:**
- Consumes: nothing (static markup).
- Produces: DOM elements that Tasks 5–9 attach behavior to — element ids are listed in the code below and must match exactly.

- [ ] **Step 1: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Карточки</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: #f4f4f4; margin: 0; }
  .screen { max-width: 480px; margin: 40px auto; padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
  textarea { width: 100%; height: 200px; font-family: monospace; padding: 8px; }
  button { margin: 6px; padding: 10px 18px; font-size: 1rem; cursor: pointer; border: none; border-radius: 6px; background: #3498db; color: #fff; }
  button.link-button { background: none; color: #3498db; text-decoration: underline; padding: 4px; }
  .card { width: 280px; height: 180px; margin: 30px auto; perspective: 1000px; cursor: pointer; touch-action: none; user-select: none; }
  .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.4s; transform-style: preserve-3d; }
  .card.flipped .card-inner { transform: rotateY(180deg); }
  .card-face { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border-radius: 12px; border: 3px solid #ccc; background: #fafafa; backface-visibility: hidden; padding: 12px; }
  .card-back { transform: rotateY(180deg); }
  .card.dragging-right .card-face { border-color: #2ecc71; }
  .card.dragging-left .card-face { border-color: #e74c3c; }
  #training-banner { background: #fff3cd; padding: 8px; border-radius: 6px; }
</style>
</head>
<body>
  <div id="app">

    <section id="screen-resume" class="screen" hidden>
      <h1>Найдена сохранённая колода</h1>
      <p id="resume-info"></p>
      <button id="btn-resume-continue">Продолжить</button>
      <button id="btn-resume-new">Загрузить новую</button>
    </section>

    <section id="screen-input" class="screen" hidden>
      <h1>Вставьте таблицу (слово, перевод)</h1>
      <textarea id="input-table" placeholder="кошка,cat&#10;собака,dog"></textarea>
      <p id="input-message"></p>
      <button id="btn-create-deck">Создать колоду</button>
    </section>

    <section id="screen-mode" class="screen" hidden>
      <h1>Колода готова: <span id="mode-deck-size"></span> карточек</h1>
      <button id="btn-mode-simple">Простой просмотр</button>
      <button id="btn-mode-ring">Заучивание кольцами по 7</button>
      <div><button id="btn-mode-new-table" class="link-button">Загрузить новую таблицу</button></div>
    </section>

    <section id="screen-training" class="screen" hidden>
      <p id="training-progress"></p>
      <p id="training-banner" hidden></p>
      <div id="card" class="card">
        <div class="card-inner">
          <div class="card-face card-front"><span id="card-front-text"></span></div>
          <div class="card-face card-back"><span id="card-back-text"></span></div>
        </div>
      </div>
      <div class="training-controls">
        <button id="btn-swipe-left">← Не знаю</button>
        <button id="btn-swipe-right">Знаю →</button>
      </div>
      <div><button id="btn-training-new-table" class="link-button">Загрузить новую таблицу</button></div>
    </section>

    <section id="screen-done" class="screen" hidden>
      <h1>Колода выучена!</h1>
      <button id="btn-done-restart">Начать заново</button>
      <button id="btn-done-menu">В меню</button>
    </section>

  </div>

  <script src="./deck.js"></script>
  <script src="./main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Manual verification**

Open `index.html` directly in a browser (double-click the file, or run `open index.html` on macOS). Since `main.js` does not exist yet, expect a console error (`main.js` 404) and a blank page (all sections have `hidden`) — this is expected at this stage. Confirm via browser dev tools (View Source or Elements panel) that all five `<section>` elements listed above are present in the DOM with their exact ids.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add HTML skeleton and styling for all screens"
```

---

### Task 5: Screen navigation and table input

**Files:**
- Create: `main.js`

**Interfaces:**
- Consumes: `Deck.parseTable` (Task 1), DOM ids from `index.html` (Task 4).
- Produces: module-level `state` object `{ screen, deck, session, originalMode }` and `showScreen(id: string)` helper, used by every later task.

- [ ] **Step 1: Write `main.js`**

```js
(function () {
  'use strict';

  var state = {
    screen: 'input',
    deck: [],
    session: null,
    originalMode: null
  };

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.hidden = el.id !== id;
    });
  }

  function initInputScreen() {
    var textarea = document.getElementById('input-table');
    var message = document.getElementById('input-message');
    var button = document.getElementById('btn-create-deck');

    button.addEventListener('click', function () {
      var result = Deck.parseTable(textarea.value);
      if (result.cards.length === 0) {
        message.textContent = 'Не удалось найти ни одной карточки. Проверьте формат таблицы.';
        return;
      }
      message.textContent = 'Добавлено ' + result.addedCount + ' карточек, пропущено ' + result.skippedCount + ' строк.';
      state.deck = result.cards;
      state.session = null;
      state.screen = 'mode';
      document.getElementById('mode-deck-size').textContent = String(state.deck.length);
      showScreen('screen-mode');
    });
  }

  function boot() {
    initInputScreen();
    showScreen('screen-input');
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
```

- [ ] **Step 2: Manual verification**

Open `index.html` in a browser.
1. The input screen ("Вставьте таблицу...") should be the only visible screen.
2. Paste `кошка,cat\nсобака,dog` into the textarea and click "Создать колоду".
3. Expected: the message "Добавлено 2 карточек, пропущено 0 строк." appears, the screen switches to "Колода готова: 2 карточек".
4. Reload the page, click "Создать колоду" with an empty textarea.
5. Expected: the message "Не удалось найти ни одной карточки. Проверьте формат таблицы." appears and the screen does not change.

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: add screen navigation and table input handling"
```

---

### Task 6: Mode selection and training screen rendering

**Files:**
- Modify: `main.js`

**Interfaces:**
- Consumes: `Deck.createSession` (Task 2), `state`/`showScreen` (Task 5).
- Produces: `startSession(mode: 'simple'|'ring')` and `renderTrainingScreen()`, both reused by Tasks 8 and 9.

- [ ] **Step 1: Modify `main.js`**

Insert the following functions between `showScreen` and `initInputScreen`:

```js
  function renderTrainingScreen() {
    var session = state.session;

    if (session.finished) {
      state.screen = 'done';
      showScreen('screen-done');
      return;
    }

    var card = document.getElementById('card');
    card.classList.remove('flipped');

    var current = session.queue[0];
    document.getElementById('card-front-text').textContent = current.front;
    document.getElementById('card-back-text').textContent = current.back;

    var progress = document.getElementById('training-progress');
    if (session.mode === 'ring') {
      progress.textContent = 'Блок ' + (session.blockIndex + 1) + ' из ' + session.allBlocks.length + '. Осталось в блоке: ' + session.queue.length;
    } else {
      progress.textContent = 'Раунд ' + session.round + '. Осталось в раунде: ' + session.queue.length;
    }
  }

  function startSession(mode) {
    state.originalMode = mode;
    state.session = Deck.createSession(state.deck, mode);
    state.screen = 'training';
    document.getElementById('training-banner').hidden = true;
    showScreen('screen-training');
    renderTrainingScreen();
  }

  function initModeScreen() {
    document.getElementById('btn-mode-simple').addEventListener('click', function () {
      startSession('simple');
    });
    document.getElementById('btn-mode-ring').addEventListener('click', function () {
      startSession('ring');
    });
  }
```

Update `boot` to also call `initModeScreen()`:

```js
  function boot() {
    initInputScreen();
    initModeScreen();
    showScreen('screen-input');
  }
```

- [ ] **Step 2: Manual verification**

Open `index.html`, create a deck from `a,1\nb,2\nc,3` (3 cards).
1. Click "Простой просмотр". Expected: training screen shows "Раунд 1. Осталось в раунде: 3" and the card front shows "a".
2. Reload, create a deck of 10 rows (e.g. paste 10 lines like `w1,t1` through `w10,t10`), click "Заучивание кольцами по 7".
3. Expected: training screen shows "Блок 1 из 2. Осталось в блоке: 7".

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: add mode selection and training screen rendering"
```

---

### Task 7: Card flip

**Files:**
- Modify: `main.js`

**Interfaces:**
- Consumes: `#card` element (Task 4).
- Produces: `initCardFlip()`, and a `card.dataset.suppressFlip` convention that Task 8 sets to `'1'` right before a drag-driven `click` fires, so a completed swipe never also toggles the flip.

- [ ] **Step 1: Modify `main.js`**

Insert this function after `initModeScreen`:

```js
  function initCardFlip() {
    var card = document.getElementById('card');
    card.addEventListener('click', function () {
      if (card.dataset.suppressFlip === '1') {
        card.dataset.suppressFlip = '0';
        return;
      }
      card.classList.toggle('flipped');
    });
  }
```

Update `boot`:

```js
  function boot() {
    initInputScreen();
    initModeScreen();
    initCardFlip();
    showScreen('screen-input');
  }
```

- [ ] **Step 2: Manual verification**

Create any deck, start "Простой просмотр". Click the card: expected it visually flips to show the translation (back face). Click again: expected it flips back to the word (front face).

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: add card flip interaction"
```

---

### Task 8: Swipe gestures (drag, keyboard, buttons)

**Files:**
- Modify: `main.js`

**Interfaces:**
- Consumes: `Deck.swipe` (Task 3), `renderTrainingScreen`/`startSession` (Task 6), `card.dataset.suppressFlip` (Task 7).
- Produces: `commitSwipe(direction: 'left'|'right')`, used by Task 9's persistence hook.

- [ ] **Step 1: Modify `main.js`**

Insert this block after `initCardFlip`:

```js
  function commitSwipe(direction) {
    var previousMode = state.session.mode;
    state.session = Deck.swipe(state.session, direction);

    var card = document.getElementById('card');
    card.style.transform = '';
    card.classList.remove('dragging-right', 'dragging-left');

    renderTrainingScreen();

    var banner = document.getElementById('training-banner');
    if (previousMode === 'ring' && state.session.mode === 'simple') {
      banner.textContent = 'Все блоки пройдены! Финальное повторение всей колоды.';
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  function initSwipeButtons() {
    document.getElementById('btn-swipe-left').addEventListener('click', function () {
      commitSwipe('left');
    });
    document.getElementById('btn-swipe-right').addEventListener('click', function () {
      commitSwipe('right');
    });
  }

  function initKeyboardSwipe() {
    document.addEventListener('keydown', function (event) {
      if (state.screen !== 'training') return;
      if (event.key === 'ArrowRight') commitSwipe('right');
      if (event.key === 'ArrowLeft') commitSwipe('left');
    });
  }

  function initDragSwipe() {
    var card = document.getElementById('card');
    var dragging = false;
    var startX = 0;
    var currentDx = 0;
    var SWIPE_THRESHOLD = 80;

    card.addEventListener('pointerdown', function (event) {
      dragging = true;
      startX = event.clientX;
      card.setPointerCapture(event.pointerId);
    });

    card.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      currentDx = event.clientX - startX;
      card.style.transform = 'translateX(' + currentDx + 'px) rotate(' + (currentDx / 20) + 'deg)';
      card.classList.toggle('dragging-right', currentDx > 20);
      card.classList.toggle('dragging-left', currentDx < -20);
    });

    card.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(currentDx) > SWIPE_THRESHOLD) {
        card.dataset.suppressFlip = '1';
        commitSwipe(currentDx > 0 ? 'right' : 'left');
      } else {
        card.style.transform = '';
        card.classList.remove('dragging-right', 'dragging-left');
      }
      currentDx = 0;
    });
  }
```

Update `boot`:

```js
  function boot() {
    initInputScreen();
    initModeScreen();
    initCardFlip();
    initSwipeButtons();
    initKeyboardSwipe();
    initDragSwipe();
    showScreen('screen-input');
  }
```

- [ ] **Step 2: Manual verification**

Create a deck of 3 cards (`a,1\nb,2\nc,3`), start "Простой просмотр".
1. Click "Знаю →" three times. Expected: "Осталось в раунде" counts down 3→2→1, then the session either starts "Раунд 2" (if any card was ever left-swiped — it wasn't here) or the screen switches to "Колода выучена!" (expected here, since all three went right in one clean pass).
2. Restart, this time click "← Не знаю" once. Expected: "Осталось в раунде" stays at 3, but the front card text changes to the next card (the one you swiped left is now at the back of the queue).
3. Press the `ArrowRight` key while a card is showing. Expected: same effect as clicking "Знаю →".
4. With a mouse, press down on the card, drag it more than 80px to the right, and release. Expected: same effect as clicking "Знаю →", with the card border turning green while dragging past 20px.
5. Create a deck of 8 rows, start "Заучивание кольцами по 7", swipe all 7 cards of block 1 right. Expected: progress switches to "Блок 2 из 2. Осталось в блоке: 1". Swipe that last card right too. Expected: the banner "Все блоки пройдены! Финальное повторение всей колоды." appears and progress switches to "Раунд 1. Осталось в раунде: 8".

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: add swipe gestures via drag, keyboard, and buttons"
```

---

### Task 9: Persistence, resume prompt, and done screen

**Files:**
- Modify: `main.js`

**Interfaces:**
- Consumes: `state`, `showScreen`, `startSession`, `renderTrainingScreen`, `commitSwipe` (Tasks 5–8).
- Produces: `saveState()`, `loadState()`, `clearState()` — `saveState()` is called after every action that changes `state.deck` or `state.session`.

- [ ] **Step 1: Modify `main.js`**

Add the storage key constant near the top, right after `'use strict';`:

```js
  var STORAGE_KEY = 'flashcards.state.v1';
```

Insert these functions after `showScreen`:

```js
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        deck: state.deck,
        session: state.session,
        screen: state.screen,
        originalMode: state.originalMode
      }));
    } catch (e) {
      return;
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      return;
    }
  }

  function goToInputScreen() {
    state.deck = [];
    state.session = null;
    state.originalMode = null;
    state.screen = 'input';
    document.getElementById('input-table').value = '';
    document.getElementById('input-message').textContent = '';
    showScreen('screen-input');
  }

  function confirmNewTable() {
    if (window.confirm('Загрузить новую таблицу? Текущая колода и прогресс будут удалены.')) {
      clearState();
      goToInputScreen();
    }
  }

  function initNewTableLinks() {
    document.getElementById('btn-mode-new-table').addEventListener('click', confirmNewTable);
    document.getElementById('btn-training-new-table').addEventListener('click', confirmNewTable);
  }

  function initDoneScreen() {
    document.getElementById('btn-done-restart').addEventListener('click', function () {
      startSession(state.originalMode);
      saveState();
    });
    document.getElementById('btn-done-menu').addEventListener('click', function () {
      state.session = null;
      state.screen = 'mode';
      showScreen('screen-mode');
      saveState();
    });
  }
```

Now wire `saveState()` into the existing action points. In `initInputScreen`, add a call right before `showScreen('screen-mode');`:

```js
      message.textContent = 'Добавлено ' + result.addedCount + ' карточек, пропущено ' + result.skippedCount + ' строк.';
      state.deck = result.cards;
      state.session = null;
      state.screen = 'mode';
      document.getElementById('mode-deck-size').textContent = String(state.deck.length);
      saveState();
      showScreen('screen-mode');
```

In `startSession`, add a call right before `showScreen('screen-training');`:

```js
  function startSession(mode) {
    state.originalMode = mode;
    state.session = Deck.createSession(state.deck, mode);
    state.screen = 'training';
    document.getElementById('training-banner').hidden = true;
    saveState();
    showScreen('screen-training');
    renderTrainingScreen();
  }
```

In `commitSwipe`, add a call at the very end of the function:

```js
    if (previousMode === 'ring' && state.session.mode === 'simple') {
      banner.textContent = 'Все блоки пройдены! Финальное повторение всей колоды.';
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }

    saveState();
  }
```

Finally, replace `boot` with a version that restores saved state:

```js
  function boot() {
    initInputScreen();
    initModeScreen();
    initCardFlip();
    initSwipeButtons();
    initKeyboardSwipe();
    initDragSwipe();
    initNewTableLinks();
    initDoneScreen();

    var saved = loadState();
    if (saved && saved.deck && saved.deck.length > 0) {
      document.getElementById('resume-info').textContent = 'Колода: ' + saved.deck.length + ' карточек.';

      document.getElementById('btn-resume-continue').addEventListener('click', function () {
        state.deck = saved.deck;
        state.session = saved.session;
        state.originalMode = saved.originalMode;
        state.screen = saved.screen;

        if (state.screen === 'training' && state.session) {
          showScreen('screen-training');
          renderTrainingScreen();
        } else {
          document.getElementById('mode-deck-size').textContent = String(state.deck.length);
          showScreen('screen-mode');
        }
      });

      document.getElementById('btn-resume-new').addEventListener('click', function () {
        clearState();
        goToInputScreen();
      });

      showScreen('screen-resume');
      return;
    }

    showScreen('screen-input');
  }
```

- [ ] **Step 2: Manual verification**

1. Create a deck of 3 cards, start "Простой просмотр", swipe one card right. Reload the page.
2. Expected: the "Найдена сохранённая колода" screen appears showing "Колода: 3 карточек.". Click "Продолжить".
3. Expected: you land back on the training screen with "Раунд 1. Осталось в раунде: 2" (the swiped-right card stays gone).
4. Reload again, this time click "Загрузить новую" on the resume screen. Expected: you land on the empty input screen and localStorage no longer has the `flashcards.state.v1` key (check via dev tools → Application → Local Storage).
5. Create a new deck, go to the mode screen, click "Загрузить новую таблицу". Expected: a confirm dialog appears; clicking "Cancel" keeps you on the mode screen, clicking "OK" clears the deck and returns to the input screen.
6. Create a 2-card deck, start "Простой просмотр", swipe both cards right in one pass (finishing the deck). Expected: the "Колода выучена!" screen appears. Click "Начать заново": expected a fresh "Простой просмотр" session (Раунд 1) over the same 2 cards. Reload, click "Продолжить" then reach done screen again and click "В меню": expected you land on the mode-selection screen.

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: add localStorage persistence and resume/done screens"
```

---

### Task 10: Final manual QA pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full automated test suite**

Run: `node --test deck.test.js`
Expected: PASS — all 15 tests green.

- [ ] **Step 2: Run the spec's manual test checklist end to end**

Using a fresh browser profile/incognito window (to start with empty localStorage), open `index.html` and verify every item from the design spec's "Тестирование" section:

1. Paste a table using commas, then reload and paste one using tabs, then semicolons — each produces the same 2-card deck.
2. Paste a table with a header row (`слово,перевод` on line 1) — header is recognized and excluded from the count.
3. Paste a table with blank lines and a malformed row (wrong column count) — they are silently skipped and counted in the "пропущено" message.
4. Run a full "Простой просмотр" session using only the on-screen buttons, then repeat using only the keyboard arrows, then repeat using mouse drag — all three produce identical round/finish behavior.
5. Run a full "Кольца по 7" session on a deck of at least 15 cards through every block and into the final combined review round.
6. Mid-training, reload the page and confirm the resume prompt restores the exact deck and session state.
7. From the mode screen and from the training screen, click "Загрузить новую таблицу" and confirm the confirmation dialog gates the overwrite both ways (Cancel vs OK).

- [ ] **Step 3: Commit**

If the manual pass surfaces no changes, there is nothing to commit — this task is a verification gate, not a code change. If any issue is found, fix it as a new commit before considering the plan complete.
