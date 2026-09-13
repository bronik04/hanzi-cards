import { createSession, currentCardId, ringProgress, roundProgress, swipe } from '@/core/session';
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
    session = swipe(session, 'right');
    session = swipe(session, 'right');
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
