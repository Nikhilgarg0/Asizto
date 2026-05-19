/**
 * utils/useNow.js
 *
 * PERF-4: Single shared clock tick. One interval for the entire app
 * instead of one interval per medicine card.
 *
 * Usage:
 *   const now = useNow();          // updates every 60s (default)
 *   const now = useNow(5000);      // updates every 5s
 */
import { useState, useEffect } from 'react';

export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
