"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useUser } from "@/lib/queries/users";

/**
 * Someone's display name by id (`GET /users/{id}`). Profiles are for signed-in
 * users only, so a guest sees the fallback. Lists repeat the same few people;
 * the query cache asks for each of them once.
 */
export function UserName({
  id,
  fallback = "—",
  link = false,
}: {
  id: string | null | undefined;
  fallback?: string;
  /** Link to the profile inside the app. */
  link?: boolean;
}) {
  const { status } = useAuth();
  const { data } = useUser(status === "authenticated" && id ? id : undefined);
  const name = data?.displayName ?? fallback;

  if (link && id && data) {
    return (
      <Link href={`/app/users/${id}`} className="underline-offset-4 hover:text-data hover:underline">
        {name}
      </Link>
    );
  }
  return <>{name}</>;
}
