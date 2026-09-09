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
