import type { Links } from "@hourly/shared";

/** A resource as the API returns it: the data plus its hypermedia controls. */
export type Linked<T> = T & { _links: Links };

/** The envelope of every list endpoint. */
export type Page<T> = {
  items: Linked<T>[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  _links: Links;
};

/** List filters as a page holds them: everything optional. */
export type Filters<T> = { [K in keyof T]?: T[K] | null };

/** `{ scope: "owned", page: 2, q: "" }` -> `?scope=owned&page=2` (empty values dropped). */
export function toSearch(filters: object = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
