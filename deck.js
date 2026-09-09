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
