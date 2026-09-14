import { BLOCK_SIZE, splitIntoBlocks } from '@/core/deck';

export type SwipeDirection = 'left' | 'right';
export type SessionMode = 'simple' | 'ring';

/** Счётчики «знаю» и «не знаю» за тренировку. */
export type Stats = { known: number; unknown: number };

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

/**
 * Человеческое название текущего этапа тренировки. Живёт здесь, а не в экранах:
 * иначе знание об устройстве сессии расползается по слою представления.
 */
export function stageLabel(session: Session): string {
  if (session.mode === 'ring') {
    return `Блок ${session.blockIndex + 1} из ${session.blocks.length}`;
  }
  return session.finalRound ? 'Сводный круг' : `Круг ${session.round}`;
}
