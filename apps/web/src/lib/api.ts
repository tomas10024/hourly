import type { ApiError } from "@valandine/shared";

/** API klaida su HTTP kodu ir serverio grąžintu mašininiu kodu. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

/**
 * Užklausos siunčiamos į tos pačios kilmės `/api/...` maršrutą,
 * kuris jas persiunčia Valandinė API (žr. `src/app/api/[...path]/route.ts`).
 */
export async function apiFetch<T>(
  path: string,
  { body, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as ApiError | null)?.error;
    throw new ApiRequestError(
      response.status,
      error?.code ?? "UNKNOWN",
      error?.message ?? `Užklausa nepavyko (${response.status})`,
      error?.details,
    );
  }

  return payload as T;
}
