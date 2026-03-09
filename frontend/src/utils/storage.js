export function safePersist(key, data, fallback) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    if (fallback !== undefined) {
      try {
        localStorage.setItem(key, JSON.stringify(fallback));
      } catch {
        localStorage.removeItem(key);
      }
    } else {
      localStorage.removeItem(key);
    }
  }
}

export function safeRead(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}
