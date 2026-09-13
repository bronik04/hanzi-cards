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

// Через явный тип, а не через `in`: по типам PointerEvent в window есть всегда,
// и проверка `'PointerEvent' in window` сузила бы отрицательную ветку до never.
const view = window as Window & {
  PointerEvent?: typeof PointerEvent;
};
const element = Element.prototype as Element & {
  setPointerCapture?: Element['setPointerCapture'];
  releasePointerCapture?: Element['releasePointerCapture'];
};

view.PointerEvent ??= PointerEventPolyfill as unknown as typeof PointerEvent;
element.setPointerCapture ??= () => {};
element.releasePointerCapture ??= () => {};
