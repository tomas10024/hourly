"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { errorCommand, errorMessage } from "@/lib/errors";

type ToastKind = "ok" | "err";
type ToastItem = { id: number; kind: ToastKind; command: string; message: string; leaving: boolean };

type ToastApi = {
  /** `> projektas_sukurtas [201]` + a sentence. */
  success: (command: string, message: string) => void;
  error: (command: string, message: string) => void;
  /** An API failure, worded for the user (see `lib/errors.ts`). */
  fromError: (error: unknown) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = 4200;
const LEAVE_MS = 200;

/**
 * Feedback for every action, in the style of a terminal line. Replaces
 * `alert()`, which the lab criteria rule out. The list is an `aria-live`
 * region, so screen readers announce each message without moving focus.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), LEAVE_MS);
  }, []);

  const push = useCallback(
    (kind: ToastKind, command: string, message: string) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { id, kind, command, message, leaving: false }]);
      setTimeout(() => dismiss(id), VISIBLE_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (command, message) => push("ok", command, message),
      error: (command, message) => push("err", command, message),
      fromError: (error) => push("err", errorCommand(error), errorMessage(error)),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed right-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-50 grid w-[min(380px,calc(100vw-32px))] gap-2.5"
      >
        {items.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              "grid grid-cols-[1fr_auto] items-start gap-x-2 rounded-[14px] border border-border-strong bg-surface-2 py-3 pr-2 pl-4",
              "shadow-[inset_3px_0_0_var(--t),0_18px_40px_rgb(0_0_0/0.5)]",
              toast.kind === "ok" ? "[--t:var(--color-ok)]" : "[--t:var(--color-bad)]",
              toast.leaving ? "toast-leave" : "toast-enter",
            )}
          >
            <div className="grid gap-0.5">
              <span className="font-mono text-[13px] font-medium text-(--t)">{toast.command}</span>
              <span className="text-[13.5px] text-muted">{toast.message}</span>
            </div>
            <button
              type="button"
              aria-label="Uždaryti pranešimą"
              onClick={() => dismiss(toast.id)}
              className="rounded-md p-1 text-muted transition-colors hover:bg-white/5 hover:text-fg"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}
