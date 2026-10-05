"use client";

import { useHealth } from "@/lib/queries/system";
import { cx } from "@/lib/cx";

/**
 * A small status line for footers. `live` asks only whether the API process
 * answers (`GET /health`); `ready` also checks its database (`GET /health/ready`).
 */
export function ApiHealth({ kind = "ready", className }: { kind?: "live" | "ready"; className?: string }) {
  const { data, isPending, isError } = useHealth(kind);
  const ok = kind === "live" ? data?.status === "ok" : data?.database === "up";
  const [tone, text] = isPending
    ? ["text-muted", "Tikrinama…"]
    : isError
      ? ["text-bad", "API nepasiekiama"]
      : ok
        ? ["text-ok", "API veikia"]
        : ["text-warn", "Duomenų bazė nepasiekiama"];

  return (
    <span className={cx("inline-flex items-center gap-2 font-mono text-xs", tone, className)}>
      <span aria-hidden className={cx("size-[7px] rounded-full bg-current", ok && "dot-live")} />
      {text}
    </span>
  );
}
