import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// Radix (Select/Dialog) relies on a few browser APIs jsdom does not implement.
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.releasePointerCapture = () => {};
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
