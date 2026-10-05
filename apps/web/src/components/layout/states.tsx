"use client";

import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BlockProgress, Skeleton } from "@/components/ui/spinner";
import { ApiRequestError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { errorMessage } from "@/lib/errors";

/**
 * The top of every page inside the app: the same order everywhere -
 * label, title, short description, actions on the right (wrapping below on
 * a phone). A fixed skeleton makes screens easy to scan.
 */
export function PageHeader({
  label,
  title,
  description,
  actions,
  className,
}: {
  label?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="grid min-w-0 gap-1.5">
        {label && <span className="label">{`// ${label}`}</span>}
        <h1 className="font-serif text-[clamp(30px,4vw,42px)] leading-[1.05] tracking-[-0.01em]">{title}</h1>
        {description && <p className="max-w-[62ch] text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}

/** While a page's first data is on its way. */
export function LoadingState({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cx("grid gap-3.5", className)} aria-busy>
      <BlockProgress />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={["w-[92%]", "w-3/4", "w-[84%]", "w-2/3"][i % 4]} />
      ))}
    </div>
  );
}

/**
 * A failed load, explained: 404 (not there or not visible to you - the API
 * deliberately does not say which), 403, the API being down, anything else.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const status = error instanceof ApiRequestError ? error.status : 0;
  const title =
    status === 404
      ? "Signalas prarastas"
      : status === 403
        ? "Prieiga uždrausta"
        : status === 502 || status === 0
          ? "Serveris nepasiekiamas"
          : "Nepavyko įkelti";

  return (
    <EmptyState
      art={status === 404 || status === 502 || status === 0 ? "signal" : "folder"}
      title={title}
      action={
        onRetry && status !== 404 && status !== 403 ? (
          <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
            Bandyti dar kartą
          </Button>
        ) : undefined
      }
    >
      {errorMessage(error)}
    </EmptyState>
  );
}
