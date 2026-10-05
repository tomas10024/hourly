import { cx } from "@/lib/cx";

/** A small spinning ring; inherits the text colour. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Kraunama"
      className={cx(
        "animate-spin-fast inline-block size-3.5 rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}

/** Loading placeholder with a sweeping highlight. Give it a size with `className`. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("skeleton block h-3.5 rounded-md", className)} />;
}

/** The Watch Dogs block progress bar (▓▓▓▓░░░░) for longer loads. */
export function BlockProgress({ label = "Kraunama", className }: { label?: string; className?: string }) {
  return <div role="progressbar" aria-label={label} className={cx("blocks", className)} />;
}
