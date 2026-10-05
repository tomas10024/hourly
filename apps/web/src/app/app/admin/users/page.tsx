"use client";

import type { CurrentUser, Role } from "@hourly/shared";
import { Ban, IdCard, Search, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ErrorState, LoadingState, PageHeader } from "@/components/layout/states";
import { Avatar } from "@/components/layout/user-menu";
import { Badge, roleLabel } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DropdownMenu, type MenuItem } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useDeleteUser, useSetUserBlocked, useUsers } from "@/lib/queries/users";
import { useUrlFilters } from "@/lib/use-url-filters";

const ROLES: Role[] = ["CLIENT", "SPECIALIST", "ADMIN"];

export default function AdminUsersPage() {
  return (
    <Suspense>
      <AdminUsers />
    </Suspense>
  );
}

type Pending = { user: CurrentUser; action: "block" | "unblock" | "delete" };

/** Every account (`GET /users`), with blocking (`PATCH`) and removal (`DELETE`) behind confirmations. */
function AdminUsers() {
  const { user: me } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { values, set, page } = useUrlFilters(["q", "role", "blocked"] as const);
  const [q, setQ] = useState(values.q);
  useEffect(() => {
    if (q === values.q) return;
    const timer = setTimeout(() => set({ q }), 350);
    return () => clearTimeout(timer);
  }, [q, values.q, set]);

  const role = ROLES.includes(values.role as Role) ? (values.role as Role) : undefined;
  const isBlocked = values.blocked === "true" ? true : values.blocked === "false" ? false : undefined;
  const { data, error, isPending, refetch } = useUsers({ q: values.q || undefined, role, isBlocked, page, perPage: 20 });

  const block = useSetUserBlocked();
  const remove = useDeleteUser();
  const [pending, setPending] = useState<Pending | null>(null);

  const menu = (u: CurrentUser): MenuItem[] => {
    const items: MenuItem[] = [{ label: "Profilis", icon: IdCard, onSelect: () => router.push(`/app/users/${u.id}`) }];
    if (u.id === me?.id) return items;
    items.push(
      u.isBlocked
        ? { label: "Atblokuoti", icon: ShieldCheck, onSelect: () => setPending({ user: u, action: "unblock" }) }
        : { label: "Užblokuoti", icon: Ban, onSelect: () => setPending({ user: u, action: "block" }) },
      { label: "Šalinti", icon: Trash2, danger: true, onSelect: () => setPending({ user: u, action: "delete" }) },
    );
    return items;
  };

  const confirm = () => {
    if (!pending) return;
    const { user, action } = pending;
    const done = (cmd: string, text: string) => () => {
      toast.success(cmd, text);
      setPending(null);
    };
    const failed = (e: unknown) => {
      toast.fromError(e);
      setPending(null);
    };
    if (action === "delete") {
      remove.mutate(user.id, { onSuccess: done("> naudotojas_pasalintas [204]", `${user.displayName} pašalintas.`), onError: failed });
    } else {
      block.mutate(
        { userId: user.id, isBlocked: action === "block" },
        {
          onSuccess: done(
            action === "block" ? "> naudotojas_uzblokuotas [200]" : "> naudotojas_atblokuotas [200]",
            action === "block" ? `${user.displayName} nebegalės prisijungti.` : `${user.displayName} vėl gali prisijungti.`,
          ),
          onError: failed,
        },
      );
    }
  };

  const texts = {
    block: ["Užblokuoti naudotoją?", "Užblokuoti", "nebegalės prisijungti, o jo galiojantys žetonai nustos veikti iš karto."],
    unblock: ["Atblokuoti naudotoją?", "Atblokuoti", "vėl galės prisijungti."],
    delete: ["Šalinti naudotoją?", "Šalinti", "bus pašalintas negrįžtamai. Paskyrų su projektais ar darbo istorija šalinti negalima – jas galima užblokuoti."],
  } as const;
  const current = pending ? texts[pending.action] : null;

  return (
    <div className="grid gap-8">
      <PageHeader label="administravimas" title="Naudotojai" description="Visos platformos paskyros. Pažeidėjus galima užblokuoti iš karto." />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px] md:items-end">
        <Field label="Paieška">
          {(p) => (
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <Input {...p} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Vardas arba el. paštas" className="pl-9" />
            </div>
          )}
        </Field>
        <Field label="Rolė">
          {(p) => (
            <Select {...p} value={role ?? ""} onChange={(e) => set({ role: e.target.value || null })}>
              <option value="">Visos</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Būsena">
          {(p) => (
            <Select {...p} value={values.blocked} onChange={(e) => set({ blocked: e.target.value || null })}>
              <option value="">Visi</option>
              <option value="false">Aktyvūs</option>
              <option value="true">Užblokuoti</option>
            </Select>
          )}
        </Field>
      </div>

      <Card className="p-3 md:p-4">
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <LoadingState />
        ) : (
          <DataTable
            caption="Naudotojai"
            rows={data.items}
            rowKey={(u) => u.id}
            empty={<EmptyState art="folder" title="Nieko nerasta">Pakeiskite paiešką ar filtrus.</EmptyState>}
            columns={[
              {
                key: "name",
                header: "Naudotojas",
                mobile: "title",
                cell: (u) => (
                  <Link href={`/app/users/${u.id}`} className="inline-flex items-center gap-2.5 hover:text-data">
                    <Avatar name={u.displayName} className="size-7 text-[10px]" />
                    {u.displayName}
                  </Link>
                ),
              },
              { key: "email", header: "El. paštas", cell: (u) => <span className="text-muted">{u.email}</span> },
              { key: "role", header: "Rolė", cell: (u) => roleLabel(u.role) },
              { key: "state", header: "Būsena", cell: (u) => (u.isBlocked ? <Badge tone="bad">Užblokuotas</Badge> : <Badge tone="ok">Aktyvus</Badge>) },
              { key: "created", header: "Užsiregistravo", mobile: "hidden", cell: (u) => <span className="tabular">{formatDate(u.createdAt)}</span> },
              { key: "menu", header: <span className="sr-only">Veiksmai</span>, className: "w-12", mobile: "aside", cell: (u) => <DropdownMenu items={menu(u)} /> },
            ]}
          />
        )}
      </Card>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: p === 1 ? null : p })} />}

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={current?.[0] ?? ""}
        confirmLabel={current?.[1] ?? ""}
        variant={pending?.action === "unblock" ? "primary" : "danger"}
        loading={block.isPending || remove.isPending}
        onConfirm={confirm}
      >
        {pending && `${pending.user.displayName} (${pending.user.email}) ${current?.[2]}`}
      </ConfirmDialog>
    </div>
  );
}
