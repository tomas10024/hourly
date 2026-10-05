"use client";

import { IdCard, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { RoleSticker } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";

export function Avatar({ name, className = "size-8 text-xs" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center border border-data/60 bg-surface-2 font-pixel text-data ${className}`}
    >
      {initials(name)}
    </span>
  );
}

/** The signed-in user in the top bar: who it is, the account, the way out. */
export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  if (!user) return null;

  // Where to go next is the app shell's call: after a logout it leaves for "/".
  const signOut = async () => {
    try {
      await logout();
      toast.success("> atsijungta [204]", "Iki pasimatymo.");
    } catch (error) {
      toast.fromError(error);
    }
  };

  return (
    <DropdownMenu
      label={`Paskyros meniu: ${user.displayName}`}
      trigger={<Avatar name={user.displayName} />}
      triggerClassName="rounded-sm transition-opacity hover:opacity-80"
      header={
        <div className="grid gap-1.5">
          <span className="text-sm font-semibold">{user.displayName}</span>
          <span className="text-xs text-muted">{user.email}</span>
          <RoleSticker role={user.role} className="mt-1 w-fit" />
        </div>
      }
      items={[
        { label: "Paskyra", icon: UserRound, onSelect: () => router.push("/app/settings") },
        { label: "Viešas profilis", icon: IdCard, onSelect: () => router.push(`/app/users/${user.id}`) },
        { label: "Atsijungti", icon: LogOut, onSelect: signOut, danger: true },
      ]}
    />
  );
}
