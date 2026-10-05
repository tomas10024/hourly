"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiRequestError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";

/** 4xx answers will not change on a second try; network and 5xx failures might. */
function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiRequestError && error.status < 500) return false;
  return failureCount < 1;
}

/**
 * The TanStack Query client is created in component state rather than at
 * module level, so each server request gets its own cache and data from
 * different users cannot mix.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: shouldRetry,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
