import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export type MenuItem = { id: string; label: string; danger?: boolean };

type DeckMenuProps = {
  /** Доступное имя кнопки. Включает название колоды: иначе читалка
   *  произносит «Действия» подряд столько раз, сколько колод в библиотеке. */
  label: string;
  items: readonly MenuItem[];
  onSelect: (id: string) => void;
};

export default function DeckMenu({ label, items, onSelect }: DeckMenuProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  // Фокус уходит внутрь сразу после открытия: без этого клавиатурный
  // пользователь не узнаёт, что меню появилось.
  useEffect(() => {
    if (!open) return;
    focusItem(0);
  }, [open]);

  // Закрытие по клику мимо. Слушаем pointerdown, а не click: click приходит
  // после того, как элемент под курсором уже отработал своё нажатие.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (list.current?.contains(target) === true) return;
      if (button.current?.contains(target) === true) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function focusItem(index: number) {
    const nodes = list.current?.querySelectorAll('[role="menuitem"]');
    if (nodes === undefined || nodes.length === 0) return;
    const node = nodes[(index + nodes.length) % nodes.length];
    if (node instanceof HTMLElement) node.focus();
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const nodes = Array.from(list.current?.querySelectorAll('[role="menuitem"]') ?? []);
    const current = nodes.indexOf(document.activeElement as Element);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  }

  return (
    <div className="menu">
      <button
        ref={button}
        type="button"
        className="menu__button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        ⋯
      </button>

      {open && (
        <ul
          ref={list}
          className="menu__list"
          role="menu"
          aria-label={label}
          onKeyDown={onListKeyDown}
        >
          {items.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={item.danger === true ? 'menu__item menu__item--danger' : 'menu__item'}
                onClick={() => {
                  onSelect(item.id);
                  close(true);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
