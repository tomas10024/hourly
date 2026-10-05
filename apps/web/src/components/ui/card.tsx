import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * A surface for one thing (a project, a profile, a form section).
 * `hud` adds the ctOS corner brackets on hover and keyboard focus.
 */
export function Card({ hud, className, ...props }: { hud?: boolean } & ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-card border border-border bg-surface p-5 transition-colors duration-150 hover:border-border-strong",
        hud && "hud",
        className,
      )}
      {...props}
    />
  );
}

/** Label/value rows (budget, deadline, rate); values in tabular monospace. */
export function KeyValues({ rows, className }: { rows: Array<[string, ReactNode]>; className?: string }) {
  return (
    <dl className={cx("grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-sm", className)}>
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted">{key}</dt>
          <dd className="tabular text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
