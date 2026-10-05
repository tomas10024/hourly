"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { cx } from "@/lib/cx";

/**
 * A value to copy (the share link, shown only once). If the clipboard is not
 * available (http, an old browser) the text is selected instead, so the user
 * can still copy it by hand.
 */
export function CopyField({ value, label, className }: { value: string; label: string; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      inputRef.current?.select();
    }
  };

  return (
    <div className={cx("flex items-center gap-2 rounded-field border border-border-strong bg-surface-2 p-1 pl-3", className)}>
      <input
        ref={inputRef}
        readOnly
        value={value}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-fg outline-none"
      />
      <button
        type="button"
        onClick={copy}
        className={cx(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors duration-150",
          copied ? "bg-ok/15 text-ok" : "bg-white text-black hover:bg-white/90",
        )}
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Nukopijuota" : "Kopijuoti"}
      </button>
    </div>
  );
}
