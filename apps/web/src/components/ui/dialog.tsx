"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Button, type ButtonVariant } from "./button";

type Placement = "center" | "left" | "right";

/** Width of a centred dialog on wide screens: forms vs. short confirmations. */
const widths = {
  md: "md:w-[min(560px,calc(100vw-32px))]",
  sm: "md:w-[min(440px,calc(100vw-32px))]",
};

const placements: Record<Placement, string> = {
  // A card in the middle; a bottom sheet below the breakpoint (animations.css).
  center:
    "dialog-center m-0 mt-auto max-h-[calc(100dvh-24px)] w-full max-w-none rounded-t-dialog border-b-0 " +
    "md:m-auto md:max-h-[calc(100dvh-48px)] md:rounded-dialog md:border-b",
  left: "dialog-left m-0 mr-auto h-dvh max-h-dvh w-[min(300px,86vw)] border-y-0 border-l-0",
  right: "dialog-right m-0 ml-auto h-dvh max-h-dvh w-full border-y-0 border-r-0 md:w-[520px]",
};

/**
 * Modal window on top of the native `<dialog>` element. `showModal()` gives us
 * for free what is hard to get right by hand: focus moves into the dialog and
 * stays there, Esc closes it, the rest of the page is inert for screen
 * readers, and `::backdrop` dims it. Opening and closing are animated in CSS.
 *
 * The parent owns `open`; the dialog reports every way of closing (Esc, the
 * cross, a click on the backdrop) through `onClose`.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  placement = "center",
  size = "md",
  className,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  placement?: Placement;
  size?: keyof typeof widths;
  className?: string;
  /** Makes the dialog a form: Enter submits, the footer buttons can be `type="submit"`. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // A short glitch on the title as the window opens.
      titleRef.current?.classList.remove("glitch-run");
      void titleRef.current?.offsetWidth;
      titleRef.current?.classList.add("glitch-run");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const body = (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h2 className="font-serif text-[26px] leading-tight">
          <span ref={titleRef} className="glitch" data-text={typeof title === "string" ? title : undefined}>
            {title}
          </span>
        </h2>
        <Button variant="ghost" size="icon" icon={X} aria-label="Uždaryti" onClick={onClose} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      {footer && (
        <footer className="flex flex-wrap justify-end gap-2.5 border-t border-border px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          {footer}
        </footer>
      )}
    </>
  );

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        // Esc: let the parent decide, so its `open` stays the truth.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === ref.current) onClose();
      }}
      className={cx(
        "dialog flex-col overflow-hidden border border-border-strong bg-surface p-0 text-fg shadow-pop open:flex",
        placements[placement],
        placement === "center" && widths[size],
        className,
      )}
    >
      {onSubmit ? (
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event);
          }}
        >
          {body}
        </form>
      ) : (
        body
      )}
    </dialog>
  );
}

/** A side panel: the mobile menu (left) or a detail panel (right). */
export function Drawer(props: Omit<Parameters<typeof Dialog>[0], "placement"> & { side?: "left" | "right" }) {
  const { side = "right", ...rest } = props;
  return <Dialog {...rest} placement={side} />;
}

/**
 * "Are you sure?" before anything that cannot be undone. Replaces the
 * browser's `confirm()`, which the lab criteria rule out (and ESLint forbids).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel,
  variant = "danger",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Atšaukti
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-muted">{children}</div>
    </Dialog>
  );
}
