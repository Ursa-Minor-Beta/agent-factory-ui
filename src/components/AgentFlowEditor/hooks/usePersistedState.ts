import { useEffect, useState } from 'react';

// useState mirrored to localStorage; null/undefined values are not written
export function usePersistedState<T>(key: string, defaultValue: T, parse: (raw: string) => T) {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved !== null ? parse(saved) : defaultValue;
  });

  useEffect(() => {
    if (value != null) localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue] as const;
}
