"use client";

import { useParams } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { Avatar } from "@/components/layout/user-menu";
import { RoleSticker, roleLabel } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Scramble } from "@/components/ui/scramble";
import { formatDate } from "@/lib/format";
import { useUser } from "@/lib/queries/users";

/**
 * Someone's public profile (`GET /users/{id}`), drawn as a Watch Dogs
 * "profiler" card: short labelled facts in monospace, a cyan line to the avatar.
 */
export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: user, error, isPending, refetch } = useUser(id);

  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Card>
    );
  }
  if (isPending) return <LoadingState rows={5} />;

  return (
    <div className="grid max-w-2xl gap-6">
      <span className="label">{"// profilis"}</span>
      <Card hud className="grid gap-6 p-7">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar name={user.displayName} className="size-16 text-lg" />
            <span aria-hidden className="absolute top-1/2 left-full h-px w-5 bg-data" />
          </div>
          <div className="grid gap-1.5 pl-3">
            <h1 className="font-serif text-[clamp(28px,4vw,38px)] leading-tight">
              <Scramble text={user.displayName} />
            </h1>
            <RoleSticker role={user.role} className="w-fit" />
          </div>
        </div>
        <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2.5 font-mono text-[13px]">
          <dt className="label pt-0.5">Rolė</dt>
          <dd>{roleLabel(user.role)}</dd>
          <dt className="label pt-0.5">Narys nuo</dt>
          <dd>{formatDate(user.createdAt)}</dd>
          <dt className="label pt-0.5">Apie</dt>
          <dd className="font-sans text-sm leading-relaxed whitespace-pre-line text-muted">{user.bio ?? "Aprašymo nėra."}</dd>
        </dl>
      </Card>
    </div>
  );
}
