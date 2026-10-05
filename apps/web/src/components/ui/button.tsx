import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "hack" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-button border font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none aria-busy:opacity-85";

const variants: Record<ButtonVariant, string> = {
  // Resend: a white pill.
  primary: "border-transparent bg-white text-black hover:shadow-[0_0_0_4px_rgb(255_255_255/0.08)]",
  // The one pink action of a screen; it glows on hover.
  hack:
    "border-transparent bg-hack text-on-accent " +
    "hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-hack)_25%,transparent),0_0_28px_color-mix(in_srgb,var(--color-hack)_35%,transparent)]",
  secondary: "border-border-strong bg-transparent text-fg hover:border-white/30 hover:bg-white/[0.04]",
  ghost: "border-transparent bg-transparent text-muted hover:bg-white/5 hover:text-fg",
  danger: "border-bad/40 bg-transparent text-bad hover:bg-bad/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-[38px] px-4 text-sm",
  icon: "size-[38px] p-0",
};

/** The classes of a button, for elements that are not `<button>` (links). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cx(base, variants[variant], sizes[size], className);
}

type OwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Shows a spinner, marks the button busy and ignores clicks. */
  loading?: boolean;
  /** Plays the glitch on hover (string children only). Meant for the main action. */
  glitch?: boolean;
};

function Content({ icon: Icon, loading, glitch, children }: OwnProps & { children?: ReactNode }) {
  return (
    <>
      {loading ? <Spinner /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
      {glitch && typeof children === "string" ? (
        <span className="glitch" data-text={children}>
          {children}
        </span>
      ) : (
        children
      )}
    </>
  );
}

export function Button({
  variant,
  size,
  icon,
  loading,
  glitch,
  className,
  children,
  type = "button",
  ...props
}: OwnProps & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      aria-busy={loading || undefined}
      {...props}
    >
      <Content icon={icon} loading={loading} glitch={glitch}>
        {children}
      </Content>
    </button>
  );
}

/** A link that looks like a button (navigation, not an action). */
export function ButtonLink({
  variant,
  size,
  icon,
  glitch,
  className,
  children,
  ...props
}: Omit<OwnProps, "loading"> & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      <Content icon={icon} glitch={glitch}>
        {children}
      </Content>
    </Link>
  );
}
