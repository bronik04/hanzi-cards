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
    initModeScreen();
    initCardFlip();
    initSwipeButtons();
    initKeyboardSwipe();
    initDragSwipe();
    showScreen('screen-input');
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
