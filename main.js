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
    showScreen('screen-input');
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
