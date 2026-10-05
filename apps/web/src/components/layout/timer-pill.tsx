"use client";

import Link from "next/link";
import { formatClock } from "@/lib/format";
import { useRunningSession } from "@/lib/queries/sessions";
import { useNow } from "@/lib/use-now";

/**
 * The session being timed, always in view in the top bar: a breathing pink
 * dot and the elapsed time, counted in the browser from `startedAt`.
 * Nothing is shown when no session runs (or for roles that do not record time).
 */
export function TimerPill() {
  const { session } = useRunningSession();
  const now = useNow(1000, session !== null);
  if (!session) return null;

  const elapsed = formatClock(now - new Date(session.startedAt).getTime());
  return (
    <Link
      href="/app/sessions"
      aria-label={`Vykdoma sesija: ${elapsed}`}
      className="inline-flex h-8 items-center gap-2 rounded-full border border-hack/50 px-3 font-mono text-[13px] tabular-nums transition-colors hover:border-hack hover:bg-hack/10"
    >
      <span aria-hidden className="dot-live size-[7px] rounded-full bg-hack text-hack" />
      {elapsed}
    </Link>
  );
}
