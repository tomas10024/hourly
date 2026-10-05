import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/*
 * Pixel illustrations for empty and error states, drawn as SVG rectangles
 * (`crispEdges`): sharp at any size, a few hundred bytes, and coloured from
 * the design tokens. Each row is a string; `#` is a muted pixel, `*` a pink one.
 */
const ART = {
  folder: [
    "............",
    "............",
    "............",
    ".####.......",
    ".##########.",
    ".#........#.",
    ".#...**...#.",
    ".#..*..*..#.",
    ".#...**...#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  signal: [
    "............",
    "..........*.",
    ".........*..",
    "........#...",
    "......#.#...",
    "....#.#.#...",
    "..#.#.#.#...",
    "..#.#.#.#...",
    "..#.#.#.#...",
    "............",
    ".*********..",
    "............",
  ],
  clock: [
    "............",
    "...######...",
    "..#......#..",
    ".#...*....#.",
    ".#...*....#.",
    ".#...*....#.",
    ".#...****.#.",
    ".#........#.",
    "..#......#..",
    "...######...",
    "............",
    "............",
  ],
} as const;

export type PixelArtName = keyof typeof ART;

export function PixelArt({ name, className }: { name: PixelArtName; className?: string }) {
  const rows = ART[name];
  return (
    <svg
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden
      className={cx("size-20", className)}
    >
      {rows.flatMap((row, y) =>
        [...row].map((pixel, x) =>
          pixel === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={pixel === "*" ? "var(--color-hack)" : "var(--color-muted)"}
            />
          ),
        ),
      )}
    </svg>
  );
}

/** What a list shows when it has nothing yet: what will appear here, and how to add the first one. */
export function EmptyState({
  art = "folder",
  title,
  children,
  action,
  className,
}: {
  art?: PixelArtName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("grid justify-items-center gap-2.5 px-5 py-10 text-center", className)}>
      <PixelArt name={art} />
      <h3 className="mt-1.5 font-semibold">{title}</h3>
      {children && <p className="max-w-[34ch] text-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
