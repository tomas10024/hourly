"use client";

import { useEffect, useState } from "react";

const GLYPHS = "▓▒░<>/#*+=01";
/** Characters that keep their place, so numbers and sentences keep their shape. */
const KEEP = /[\s,.:€%/-]/;

/** The text with every other character blanked out - the same on server and client. */
function masked(text: string) {
  return [...text].map((ch) => (KEEP.test(ch) ? ch : "░")).join("");
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * "Decrypting" text: the characters show as noise and settle into the real
 * text from left to right over `duration` ms - on mount and whenever `text`
 * changes.
 *
 * Meant for values that have just come from the API (a page title, report
 * totals): the "animation while data is returned" of the lab criteria. It
 * swaps characters, not styles, so it is the one effect that needs script.
 * With reduced motion the text appears at once.
 */
export function useScramble(text: string, duration = 450): string {
  const [shown, setShown] = useState(() => masked(text));

  useEffect(() => {
    const span = reducedMotion() ? 0 : duration;
    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = span === 0 ? 1 : Math.min(1, (now - start) / span);
      const settled = Math.floor(progress * text.length);
      let next = text.slice(0, settled);
      for (let i = settled; i < text.length; i++) {
        next += KEEP.test(text[i]) ? text[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration]);

  return shown;
}
