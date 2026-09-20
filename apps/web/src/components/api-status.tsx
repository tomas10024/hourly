"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type Health = { status: string; database: string };

/**
 * Checks whether the API and the database are reachable through the proxy.
 * Useful while setting up the environment: it shows which part is missing.
 */
export function ApiStatus() {
  const { data, error, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<Health>("/health/ready"),
  });

  if (isPending) return <Badge tone="muted">Tikrinama…</Badge>;

  if (error) {
    return (
      <Badge tone="bad">
        API nepasiekiama – paleiskite <code>npm run dev:api</code>
      </Badge>
    );
  }

  return data.database === "up" ? (
    <Badge tone="good">API veikia · duomenų bazė prijungta</Badge>
  ) : (
    <Badge tone="bad">
      API veikia, bet duomenų bazė nepasiekiama – <code>npm run db:up</code>
    </Badge>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "good" | "bad" | "muted";
  children: React.ReactNode;
}) {
  const tones = {
    good: "border-green-600/40 text-green-700 dark:text-green-400",
    bad: "border-red-600/40 text-red-700 dark:text-red-400",
    muted: "border-black/15 opacity-60 dark:border-white/20",
  } as const;

  return (
    <p className={`w-fit rounded-md border px-3 py-1.5 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}
