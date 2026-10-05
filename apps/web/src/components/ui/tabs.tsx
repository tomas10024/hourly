"use client";

import type { LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@/lib/cx";

export type TabItem<T extends string> = { value: T; label: string; icon?: LucideIcon; count?: number };

/**
 * Tabs with an underline that slides to the active tab. Below the breakpoint
 * the row scrolls sideways instead of wrapping. Arrow keys move between tabs
 * (the WAI-ARIA tabs pattern); the panels are the caller's.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** What the tabs switch between, for screen readers. */
  label: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // Measured before paint, so the underline never jumps from a stale spot.
  useLayoutEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(`[data-value="${value}"]`);
    if (!active) return;
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    active.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value, items]);

  const move = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = items[(index + step + items.length) % items.length];
    onChange(next.value);
    listRef.current?.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div className={cx("relative min-w-0 border-b border-border", className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        className="relative flex gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        {items.map(({ value: itemValue, label: itemLabel, icon: Icon, count }, index) => {
          const selected = itemValue === value;
          return (
            <button
              key={itemValue}
              type="button"
              role="tab"
              data-value={itemValue}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(itemValue)}
              onKeyDown={(event) => move(event, index)}
              className={cx(
                "group inline-flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm transition-colors duration-150",
                selected ? "font-medium text-fg" : "text-muted hover:text-fg",
              )}
            >
              {Icon && (
                <Icon
                  aria-hidden
                  className={cx("size-4 transition-colors", selected ? "text-hack" : "group-hover:text-fg")}
                />
              )}
              {itemLabel}
              {count !== undefined && (
                <span className="tabular rounded-md bg-white/[0.06] px-1.5 text-xs text-muted">{count}</span>
              )}
            </button>
          );
        })}
        <span
          aria-hidden
          className="absolute bottom-0 h-0.5 bg-fg transition-[left,width] duration-200 ease-snap"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>
    </div>
  );
}
