import { useEffect, useState } from "react";

/**
 * Search box har keystroke par request bhejta to backend ka rate limiter
 * (15 min mein 100 requests) foran khatam ho jata. Is liye typing rukne ka
 * intezaar karte hain.
 */
export default function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
