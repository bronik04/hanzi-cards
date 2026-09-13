import '@testing-library/jest-dom/vitest';

// jsdom не реализует PointerEvent: без полифила fireEvent.pointerDown
// не донесёт до обработчика ни clientX, ни pointerId.
class PointerEventPolyfill extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
  }
}

if (!('PointerEvent' in window)) {
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
if (Element.prototype.setPointerCapture === undefined) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
