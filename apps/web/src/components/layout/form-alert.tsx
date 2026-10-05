import { TriangleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** A message above a form: what went wrong as a whole (not tied to one field). */
export function FormAlert({ tone = "bad", children }: { tone?: "bad" | "info" | "warn"; children: ReactNode }) {
  const Icon = tone === "info" ? Info : TriangleAlert;
  return (
    <div
      role={tone === "info" ? "status" : "alert"}
      className={cx(
        "flex items-start gap-2.5 rounded-field border px-3.5 py-3 text-[13.5px]",
        tone === "bad" && "border-bad/35 bg-bad/[0.07] text-bad",
        tone === "warn" && "border-warn/35 bg-warn/[0.06] text-warn",
        tone === "info" && "border-data/35 bg-data/[0.06] text-data",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
