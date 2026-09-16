import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Число, набегающее от нуля до цели. Возвращает цель сразу, если пользователь
 * просил убрать движение: набегание там не информация, а украшение.
 */
export function useCountUp(target: number, durationMs: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced || durationMs <= 0) {
      setValue(target);
      return;
    }

    let frame = 0;
    const started = performance.now();

    function step(now: number) {
      const passed = Math.min((now - started) / durationMs, 1);
      // Замедление к концу: равномерный счёт выглядит механическим.
      const eased = 1 - Math.pow(1 - passed, 3);
      // round, а не floor: иначе последний кадр не дотягивает до цели.
      setValue(Math.round(target * eased));
      if (passed < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return value;
}
