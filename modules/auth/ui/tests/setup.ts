import '@testing-library/jest-dom/vitest';

if (typeof globalThis.PointerEvent === 'undefined') {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, init?: MouseEventInit) {
      super(type, init);
    }
  } as typeof PointerEvent;
}
