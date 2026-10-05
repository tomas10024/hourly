"use client";

import { useScramble } from "@/lib/use-scramble";

/**
 * Text that "decrypts" itself whenever its value changes (see `useScramble`).
 * Screen readers get the real text through `aria-label`, not the noise.
 */
export function Scramble({ text, duration, className }: { text: string; duration?: number; className?: string }) {
  const shown = useScramble(text, duration);
  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
