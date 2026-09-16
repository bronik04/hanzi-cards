import { act, renderHook } from '@testing-library/react';
import { useCountUp } from '@/hooks/useCountUp';

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

/**
 * Управляемый requestAnimationFrame: кадры двигаем вручную, время тоже.
 * Иначе тест подсматривает случайные кадры — результат зависит от нагрузки
 * машины, а обновления состояния прилетают вне act() и шумят в вывод.
 */
function mockFrames() {
  let now = 0;
  let pending: FrameRequestCallback | null = null;
  let nextId = 1;

  vi.stubGlobal('performance', { now: () => now });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    pending = fn;
    return nextId++;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    pending = null;
  });

  return {
    /** Проиграть один кадр, сдвинув время на `ms`. */
    advance(ms: number) {
      now += ms;
      const fn = pending;
      pending = null;
      if (fn !== null) act(() => fn(now));
    },
    get running() {
      return pending !== null;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCountUp', () => {
  it('начинает с нуля', () => {
    mockReducedMotion(false);
    mockFrames();
    expect(renderHook(() => useCountUp(22, 1400)).result.current).toBe(0);
  });

  it('доходит ровно до цели, а не около неё', () => {
    mockReducedMotion(false);
    const frames = mockFrames();
    const { result } = renderHook(() => useCountUp(22, 1000));

    frames.advance(1000);
    expect(result.current).toBe(22);
    // Досчитав, хук перестаёт просить кадры.
    expect(frames.running).toBe(false);
  });

  it('по дороге не выходит за границы и не идёт назад', () => {
    mockReducedMotion(false);
    const frames = mockFrames();
    const { result } = renderHook(() => useCountUp(22, 1000));

    const seen = [result.current];
    for (let i = 0; i < 10; i += 1) {
      frames.advance(100);
      seen.push(result.current);
    }

    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(22);
    // Монотонность: набегающее число, которое дёргается назад, читается
    // как ошибка отрисовки.
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it('на половине пути уже больше нуля, но ещё не цель', () => {
    mockReducedMotion(false);
    const frames = mockFrames();
    const { result } = renderHook(() => useCountUp(100, 1000));

    frames.advance(500);
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
  });

  // При отключённом движении числу набегать неоткуда: оно сразу готово.
  it('с prefers-reduced-motion показывает цель сразу', () => {
    mockReducedMotion(true);
    const frames = mockFrames();
    expect(renderHook(() => useCountUp(22, 1400)).result.current).toBe(22);
    expect(frames.running).toBe(false);
  });

  it('ноль остаётся нулём', () => {
    mockReducedMotion(false);
    const frames = mockFrames();
    const { result } = renderHook(() => useCountUp(0, 1000));

    frames.advance(1000);
    expect(result.current).toBe(0);
  });
});
