import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type Column<Row> = {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  /** Right-aligned tabular figures (hours, amounts). */
  numeric?: boolean;
  className?: string;
  /**
   * Its place in the card that replaces the row below the breakpoint:
   * `title` (first line, bold), `meta` (a label/value line), `aside` (top
   * right, e.g. a row menu) or `hidden`.
   */
  mobile?: "title" | "meta" | "aside" | "hidden";
};

/**
 * A table on wide screens and a list of cards below the breakpoint - a wide
 * table squeezed onto a phone is unreadable. Both are rendered and CSS picks
 * one (`md:`), so nothing depends on measuring the window in script.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  caption,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
  /** Read by screen readers; not shown. */
  caption?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  const title = columns.find((c) => c.mobile === "title") ?? columns[0];
  const aside = columns.find((c) => c.mobile === "aside");
  const meta = columns.filter((c) => c !== title && c !== aside && c.mobile !== "hidden");

  return (
    <>
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cx(
                    "border-b border-border px-3 pb-2.5 text-left font-pixel text-[10.5px] font-normal tracking-[0.06em] text-muted uppercase",
                    column.numeric && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(
                  "border-b border-border transition-[background-color,box-shadow] duration-150",
                  "hover:bg-white/[0.03] hover:shadow-[inset_2px_0_0_var(--color-hack)]",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cx("px-3 py-3", column.numeric && "tabular text-right whitespace-nowrap", column.className)}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid min-w-0 gap-2.5 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cx(
              "grid gap-2 rounded-card border border-border bg-surface p-4",
              onRowClick && "cursor-pointer active:bg-white/[0.03]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 font-semibold">{title.cell(row)}</div>
              {aside && <div className="shrink-0">{aside.cell(row)}</div>}
            </div>
            {meta.length > 0 && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                {meta.map((column) => (
                  <div key={column.key} className="contents">
                    <dt className="text-muted">{column.header}</dt>
                    <dd className={cx("text-right", column.numeric && "tabular")}>{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
