import { render, screen } from '@testing-library/react';
import Card from '@/components/Card';
import { backFace, frontFace } from '@/core/deck';
import type { Card as CardType } from '@/core/deck';
import { SWIPE_THRESHOLD } from '@/hooks/useSwipeGesture';

const card: CardType = { id: 'c1', hanzi: '你好', pinyin: 'nǐ hǎo', translation: 'привет' };
const noop = () => {};
const handlers = {
  onPointerDown: noop,
  onPointerMove: noop,
  onPointerUp: noop,
  onPointerCancel: noop,
};

function renderCard(flipped: boolean, direction: Parameters<typeof frontFace>[1]) {
  return render(
    <Card
      front={frontFace(card, direction)}
      back={backFace(card, direction)}
      flipped={flipped}
      dragX={0}
      dragging={false}
      exiting={null}
      handlers={handlers}
    />,
  );
}

describe('Card', () => {
  it('показывает лицевую сторону', () => {
    renderCard(false, 'hanzi-to-translation');
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.queryByText('привет')).not.toBeInTheDocument();
  });

  it('показывает обратную сторону после переворота', () => {
    renderCard(true, 'hanzi-to-translation');
    expect(screen.getByText('привет')).toBeInTheDocument();
    expect(screen.getByText('nǐ hǎo')).toBeInTheDocument();
  });

  it('помечает иероглиф отдельным классом', () => {
    renderCard(false, 'hanzi-to-translation');
    expect(screen.getByText('你好')).toHaveClass('card__main--hanzi');
  });

  it('не помечает перевод как иероглиф', () => {
    renderCard(false, 'translation-to-hanzi');
    expect(screen.getByText('привет')).not.toHaveClass('card__main--hanzi');
  });

  it('не выводит пустые строки', () => {
    render(
      <Card
        front={frontFace({ ...card, pinyin: '' }, 'hanzi-to-translation')}
        back={backFace({ ...card, pinyin: '' }, 'hanzi-to-translation')}
        flipped
        dragX={0}
        dragging={false}
        exiting={null}
        handlers={handlers}
      />,
    );
    expect(screen.getByText('привет')).toBeInTheDocument();
    expect(document.querySelectorAll('.card__secondary')).toHaveLength(0);
  });

  it('доступна с клавиатуры', () => {
    renderCard(false, 'hanzi-to-translation');
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
  });
});

describe('Card, подкраска по ходу жеста', () => {
  function renderDragged(dragX: number, exiting: 'left' | 'right' | null = null) {
    const { container } = render(
      <Card
        front={frontFace(card, 'hanzi-to-translation')}
        back={backFace(card, 'hanzi-to-translation')}
        flipped={false}
        dragX={dragX}
        dragging={dragX !== 0}
        exiting={exiting}
        handlers={handlers}
      />,
    );
    // Читаем из style, а не из getComputedStyle: jsdom не считает каскад,
    // но инлайновые свойства, которые ставит сам компонент, здесь видны.
    const node = container.querySelector('.card') as HTMLElement;
    return {
      yes: Number(node.style.getPropertyValue('--tint-yes')),
      no: Number(node.style.getPropertyValue('--tint-no')),
    };
  }

  const tint = (dragX: number) => renderDragged(dragX);

  it('без жеста подкраски нет', () => {
    expect(tint(0)).toEqual({ yes: 0, no: 0 });
  });

  // Ступенька на 20 пикселях заменена на непрерывный рост: на половине пути
  // подкраска ровно вполовину.
  it('на половине порога подкрашена наполовину', () => {
    expect(tint(SWIPE_THRESHOLD / 2).yes).toBeCloseTo(0.5, 2);
  });

  it('на пороге подкрашена полностью', () => {
    expect(tint(SWIPE_THRESHOLD).yes).toBe(1);
  });

  // Дальше порога свайп уже засчитан, ярче становиться некуда.
  it('за порогом не переливается через единицу', () => {
    expect(tint(SWIPE_THRESHOLD * 3).yes).toBe(1);
  });

  it('влево красит красным, а не зелёным', () => {
    const { yes, no } = tint(-SWIPE_THRESHOLD);
    expect(no).toBe(1);
    expect(yes).toBe(0);
  });

  it('при отъезде подкраска на максимуме', () => {
    expect(renderDragged(0, 'right').yes).toBe(1);
  });
});
