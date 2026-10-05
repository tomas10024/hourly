"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * List filters kept in the address (`?q=api&page=2`), so a filtered view
 * survives a reload and can be shared as a link. Changing any filter other
 * than `page` goes back to the first page.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = useMemo(() => {
    const result = {} as Record<K | "page", string>;
    for (const key of [...keys, "page"] as const) result[key as K] = params.get(key) ?? "";
    return result;
  }, [params, keys]);

  const set = useCallback(
    (changes: Partial<Record<K | "page", string | number | boolean | null>>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "" || value === false) next.delete(key);
        else next.set(key, String(value));
      }
      if (!("page" in changes)) next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const page = Math.max(1, Number(values.page) || 1);
  return { values, set, page };
}
