import { useEffect, useState } from 'react';

// Returns `value` after it has stayed unchanged for `delayMs`.
export function useDebounce(value, delayMs = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
