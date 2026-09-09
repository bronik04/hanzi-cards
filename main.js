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
