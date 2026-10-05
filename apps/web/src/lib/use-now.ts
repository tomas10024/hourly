"use client";

import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs` while `active`. A running
 * timer counts in the browser from the session's `startedAt` instead of
 * asking the API every second.
 */
export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, intervalMs);
    const frame = requestAnimationFrame(tick);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(frame);
    };
  }, [intervalMs, active]);

  return now;
}
