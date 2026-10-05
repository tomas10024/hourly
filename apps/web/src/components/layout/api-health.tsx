"use client";

import { useHealth } from "@/lib/queries/system";
import { cx } from "@/lib/cx";

/** A small status line for footers: is the API up, and is its database? (`GET /health/ready`) */
export function ApiHealth({ className }: { className?: string }) {
  const { data, isPending, isError } = useHealth("ready");
  const ok = data?.database === "up";
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
