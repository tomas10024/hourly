"use client";

import { Ellipsis, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export type MenuItem = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
};

/**
 * A row menu ("⋯"): each item with its icon. Closes on choice, Esc or a click
 * elsewhere; arrow keys move through the items. Items for actions the server
 * did not offer (`_links`) are simply not passed in.
 */
export function DropdownMenu({
  items,
  label = "Veiksmai",
  trigger,
  triggerClassName,
  header,
  className,
}: {
  items: MenuItem[];
  label?: string;
  /** What the button shows; the "⋯" icon by default. */
  trigger?: ReactNode;
  triggerClassName?: string;
  /** Non-interactive content above the items (e.g. who is signed in). */
  header?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (items.length === 0) return null;

  const focusSibling = (step: number) => {
    const all = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = all.indexOf(document.activeElement as HTMLElement);
    all[(index + step + all.length) % all.length]?.focus();
  };

  return (
    <div ref={rootRef} className={cx("relative inline-block", className)} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={
          triggerClassName ??
          "grid size-8 place-items-center rounded-lg border border-border-strong text-muted transition-colors hover:border-white/30 hover:text-fg"
        }
      >
        {trigger ?? <Ellipsis className="size-4" aria-hidden />}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          onKeyDown={(event) => {
            const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
            if (!step) return;
            event.preventDefault();
            focusSibling(step);
          }}
          className="fade-up absolute top-full right-0 z-30 mt-1.5 grid min-w-44 gap-0.5 rounded-xl border border-border-strong bg-surface-2 p-1.5 shadow-pop [animation-duration:0.15s]"
        >
          {header && <div className="border-b border-border px-2.5 pt-1.5 pb-2.5 mb-1">{header}</div>}
          {items.map(({ label: itemLabel, icon: Icon, onSelect, danger }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              className={cx(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus:outline-none",
                danger ? "text-bad hover:bg-bad/10 focus:bg-bad/10" : "hover:bg-white/5 focus:bg-white/5",
              )}
            >
              <Icon aria-hidden className="size-4 text-muted" />
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
