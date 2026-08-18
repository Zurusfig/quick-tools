"use client";

import { useEffect, useState } from "react";

export function usePersistedState(
  key: string,
  initial: string
): [string, (value: string) => void] {
  const storageKey = `quick-tools:${key}`;
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initial;
    return window.localStorage.getItem(storageKey) ?? initial;
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, value);
  }, [storageKey, value]);

  return [value, setValue];
}

export function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
