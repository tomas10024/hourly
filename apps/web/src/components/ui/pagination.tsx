import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/cx";

/** The page numbers to show: always the first and last, the current one with its neighbours, gaps as null. */
function pageList(page: number, totalPages: number): Array<number | null> {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: Array<number | null> = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push(null);
    result.push(p);
  });
  return result;
}

const cell =
  "grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-[13px] font-semibold tabular transition-colors duration-150";

/** Pages of a list (`page`, `totalPages` come straight from the API's list envelope). */
export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Puslapiai" className={cx("flex flex-wrap items-center justify-center gap-1.5", className)}>
      <button
        type="button"
        aria-label="Ankstesnis puslapis"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cx(cell, "border-border-strong text-muted hover:text-fg disabled:opacity-40")}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {pageList(page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onChange(p)}
            className={cx(
              cell,
              p === page ? "border-transparent bg-white text-black" : "border-border-strong hover:border-white/30",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Kitas puslapis"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={cx(cell, "border-border-strong text-muted hover:text-fg disabled:opacity-40")}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
