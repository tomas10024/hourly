import Link from "next/link";
import { cx } from "@/lib/cx";

/*
 * The Hourly mark: a 7x7 pixel hourglass with two pink grains of sand.
 * Drawn as SVG rectangles with `crispEdges`, so the pixels stay sharp at any
 * size - a raster image would blur when scaled.
 */
const FRAME: Array<[number, number, number]> = [
  // [x, y, width] of each white run
  [0, 0, 7],
  [1, 1, 1], [5, 1, 1],
  [2, 2, 1], [4, 2, 1],
  [2, 4, 1], [4, 4, 1],
  [1, 5, 1], [5, 5, 1],
  [0, 6, 7],
];
const SAND: Array<[number, number]> = [
  [3, 3],
  [3, 5],
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 7" aria-hidden className={cx("size-[22px]", className)} shapeRendering="crispEdges">
      {FRAME.map(([x, y, w]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill="currentColor" />
      ))}
      {SAND.map(([x, y]) => (
        <rect key={`s${x}-${y}`} x={x} y={y} width={1} height={1} fill="var(--color-hack)" />
      ))}
    </svg>
  );
}

/** Mark and word; the word glitches on hover. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Hourly – pradžia"
      className={cx("inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-fg", className)}
    >
      <LogoMark />
      <span className="glitch" data-text="hourly">
        hourly
      </span>
    </Link>
  );
}
