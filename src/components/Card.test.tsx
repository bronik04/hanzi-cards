import { render, screen } from '@testing-library/react';
import Card from '@/components/Card';
import { backFace, frontFace } from '@/core/deck';
import type { Card as CardType } from '@/core/deck';

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
