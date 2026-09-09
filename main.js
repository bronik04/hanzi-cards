(function () {
  'use strict';

  var STORAGE_KEY = 'flashcards.state.v1';

  var state = {
    screen: 'input',
    deck: [],
    session: null,
    originalMode: null
  };

  var dragActive = false;
  var dragCurrentDx = 0;

  function resetCardVisual(card) {
    card.style.transform = '';
    card.classList.remove('dragging-right', 'dragging-left');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.hidden = el.id !== id;
    });
  }

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

  function goToModeScreen() {
    state.session = null;
    state.screen = 'mode';
    document.getElementById('mode-deck-size').textContent = String(state.deck.length);
    showScreen('screen-mode');
  }

  function isValidSession(session) {
    if (!session || !Array.isArray(session.queue)) return false;
    if (session.mode === 'ring') return Array.isArray(session.allBlocks);
    if (session.mode === 'simple') return typeof session.round === 'number';
    return false;
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
      goToModeScreen();
      saveState();
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
    saveState();
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

    dragActive = false;
    dragCurrentDx = 0;

    var card = document.getElementById('card');
    resetCardVisual(card);

    renderTrainingScreen();

    var banner = document.getElementById('training-banner');
    if (previousMode === 'ring' && state.session.mode === 'simple') {
      banner.textContent = 'Все блоки пройдены! Финальное повторение всей колоды.';
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }

    saveState();
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
    var startX = 0;
    var SWIPE_THRESHOLD = 80;

    card.addEventListener('pointerdown', function (event) {
      dragActive = true;
      startX = event.clientX;
      card.setPointerCapture(event.pointerId);
    });

    card.addEventListener('pointermove', function (event) {
      if (!dragActive) return;
      dragCurrentDx = event.clientX - startX;
      card.style.transform = 'translateX(' + dragCurrentDx + 'px) rotate(' + (dragCurrentDx / 20) + 'deg)';
      card.classList.toggle('dragging-right', dragCurrentDx > 20);
      card.classList.toggle('dragging-left', dragCurrentDx < -20);
    });

    card.addEventListener('pointercancel', function () {
      if (!dragActive) return;
      dragActive = false;
      dragCurrentDx = 0;
      resetCardVisual(card);
    });

    card.addEventListener('pointerup', function () {
      if (!dragActive) return;
      dragActive = false;
      if (Math.abs(dragCurrentDx) > SWIPE_THRESHOLD) {
        var direction = dragCurrentDx > 0 ? 'right' : 'left';
        card.dataset.suppressFlip = '1';
        commitSwipe(direction);
      } else {
        resetCardVisual(card);
      }
      dragCurrentDx = 0;
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
      goToModeScreen();
      saveState();
    });
  }

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

        if (state.screen === 'training' && isValidSession(state.session)) {
          showScreen('screen-training');
          renderTrainingScreen();
        } else if (state.screen === 'done' && isValidSession(state.session)) {
          showScreen('screen-done');
        } else {
          goToModeScreen();
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

  document.addEventListener('DOMContentLoaded', boot);
})();
