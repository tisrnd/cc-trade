const hasBrowserStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function readStorage(key, fallback = null) {
  if (!hasBrowserStorage()) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (value === null || value === undefined) return fallback;
    return JSON.parse(value);
  } catch (error) {
    console.warn(`[storage] Failed to read "${key}"`, error);
    return fallback;
  }
}

export function writeStorage(key, value) {
  if (!hasBrowserStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] Failed to write "${key}"`, error);
  }
}

export function removeStorage(key) {
  if (!hasBrowserStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storage] Failed to remove "${key}"`, error);
  }
}



