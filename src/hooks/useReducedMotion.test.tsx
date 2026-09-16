import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Listener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(initial: boolean) {
  let listener: Listener | null = null;
  const mql = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, fn: Listener) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = null;
    },
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  );
  return {
    change(matches: boolean) {
      mql.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
    get subscribed() {
      return listener !== null;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReducedMotion', () => {
  it('читает текущее значение при первом рендере', () => {
    mockMatchMedia(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });

  it('возвращает false, когда движение разрешено', () => {
    mockMatchMedia(false);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });

  // Настройку меняют на ходу — в macOS это переключатель в системных
  // настройках, и вкладка перезагружаться не обязана.
  it('следит за изменением настройки', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());

    act(() => media.change(true));
    expect(result.current).toBe(true);
  });

  it('отписывается при размонтировании', () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => useReducedMotion());
    expect(media.subscribed).toBe(true);

    unmount();
    expect(media.subscribed).toBe(false);
  });

  // Тесты и серверный рендер живут без matchMedia. Падать здесь нельзя:
  // отсутствие ответа означает «движение разрешено», а не поломку.
  it('без matchMedia считает, что движение разрешено', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });
});
