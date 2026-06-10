// localStorage wrapper matching the async window.storage API the standalone
// artifact versions used — keeps existing browser data under the same keys
// (Calculator: 'pg-v3', tags: 'pg-tags-v1').
export const storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value === null ? null : { value };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
};

export function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
