import { vi } from 'vitest';

export const createMockLocalStorage = () => {
  let store = {};

  return {
    getItem: vi.fn((key) => (key in store ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = value?.toString?.() ?? value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
};

export const attachMockLocalStorage = () => {
  const mock = createMockLocalStorage();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: mock,
  });

  return mock;
};

