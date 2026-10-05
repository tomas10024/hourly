"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/*
 * Form controls. All of them are the native elements (input, textarea,
 * select, checkbox, radio) with styling on top, so the browser keeps doing
 * what it does well: keyboard handling, autofill, date pickers, validation
 * hints and screen reader support.
 */

const control =
  "w-full rounded-field border border-border-strong bg-surface-2 text-sm text-fg placeholder:text-muted/70 " +
  "transition-[border-color,box-shadow] duration-150 hover:border-white/25 " +
  "focus:border-hack focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-hack)_22%,transparent)] focus:outline-none " +
  "aria-invalid:border-bad disabled:opacity-50 [color-scheme:dark]";

/**
 * Label, control and message, wired together for assistive technology: the
 * label points at the control, the error is announced with it.
 */
export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cx("grid min-w-0 gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? messageId : undefined,
      })}
      {message && (
        <p
          id={messageId}
          className={cx("text-[12.5px]", error ? "flex gap-1.5 text-bad" : "text-muted")}
          role={error ? "alert" : undefined}
        >
          {error && <span className="font-mono" aria-hidden>&gt;</span>}
          {message}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(control, "h-[38px] px-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(control, "min-h-[88px] resize-y px-3 py-2.5", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cx(control, "h-[38px] appearance-none pr-9 pl-3", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Checkbox({ label, className, ...props }: { label: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2.5 text-sm", className)}>
      <input
        type="checkbox"
        className="size-4 cursor-pointer rounded-[4px] accent-hack [color-scheme:dark]"
        {...props}
      />
      {label}
    </label>
  );
}

/** An on/off switch; underneath it is a checkbox with `role="switch"`. */
export function Switch({ label, className, ...props }: { label: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2.5 text-sm", className)}>
      <input type="checkbox" role="switch" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className={cx(
          "relative h-5 w-9 shrink-0 rounded-full bg-white/15 transition-colors duration-150",
          "after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:transition-transform after:duration-200 after:ease-snap",
          "peer-checked:bg-hack peer-checked:after:translate-x-4 peer-checked:after:bg-black",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-hack",
          "peer-disabled:opacity-50",
        )}
      />
      {label}
    </label>
  );
}

export type RadioOption<T extends string> = { value: T; label: ReactNode; description?: ReactNode };

/**
 * A choice between a few options shown as cards (role, project origin).
 * Native radio inputs underneath: arrow keys move between options.
 */
export function RadioCards<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  className,
}: {
  name: string;
  legend: ReactNode;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
  className?: string;
}) {
  return (
    <fieldset className={cx("grid min-w-0 gap-1.5", className)}>
      <legend className="mb-1.5 text-[13px] font-medium">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(
              "grid cursor-pointer gap-0.5 rounded-field border px-3 py-2.5 text-[13px] transition-[border-color,background-color] duration-150",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-hack",
              value === option.value
                ? "border-hack bg-hack/[0.07]"
                : "border-border-strong hover:border-white/25",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="font-medium">{option.label}</span>
            {option.description && <span className="text-xs text-muted">{option.description}</span>}
          </label>
        ))}
      </div>
      {error && (
        <p className="flex gap-1.5 text-[12.5px] text-bad" role="alert">
          <span className="font-mono" aria-hidden>&gt;</span>
          {error}
        </p>
      )}
    </fieldset>
  );
}
