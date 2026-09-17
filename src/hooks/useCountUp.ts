import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Число, набегающее от нуля до цели. Возвращает цель сразу, если пользователь
 * просил убрать движение: набегание там не информация, а украшение.
 */
export function useCountUp(target: number, durationMs: number): number {
  const reduced = useReducedMotion();
  const instant = reduced || durationMs <= 0;
  const [value, setValue] = useState(0);

  useEffect(() => {
    // Мгновенный случай ничего не ставит в состояние: значение отдаётся
    // ниже напрямую. Синхронный setState в эффекте вызвал бы лишний рендер.
    if (instant) return undefined;

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
  }, [target, durationMs, instant]);

  return instant ? target : value;
}
