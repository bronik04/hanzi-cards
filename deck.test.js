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
