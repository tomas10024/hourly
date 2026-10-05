"use client";

import type { Project, ShareLink, ShareLinkCreated } from "@hourly/shared";
import { Ban, Link2 } from "lucide-react";
import { useState } from "react";
import { FormAlert } from "@/components/layout/form-alert";
import { ErrorState, LoadingState } from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formErrors } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import { useCreateShare, useRevokeShare, useShares } from "@/lib/queries/shares";
import type { Linked } from "@/lib/types";

function shareState(link: ShareLink): [string, "ok" | "neutral" | "bad"] {
  if (link.revokedAt) return ["Atšaukta", "bad"];
  if (new Date(link.expiresAt).getTime() < Date.now()) return ["Pasibaigusi", "neutral"];
  return ["Galioja", "ok"];
}

/**
 * Share links of the project: read-only access for a client without an
 * account. The token exists in plain text only in the creation response, so
 * it is shown once, right after `POST`, and never again.
 */
export function SharesTab({ project }: { project: Project }) {
  const [onlyActive, setOnlyActive] = useState(false);
  const { data, error, isPending, refetch } = useShares(project.id, { active: onlyActive ? true : undefined, perPage: 50 });
  const toast = useToast();
  const create = useCreateShare(project.id);
  const revoke = useRevokeShare(project.id);

  const [creating, setCreating] = useState(false);
  const [days, setDays] = useState("30");
  const [createError, setCreateError] = useState<string>();
  const [created, setCreated] = useState<ShareLinkCreated | null>(null);
  const [revoking, setRevoking] = useState<Linked<ShareLink> | null>(null);

  const submit = () => {
    const value = Number(days);
    if (!Number.isInteger(value) || value < 1 || value > 365) {
      setCreateError("Sveikas skaičius nuo 1 iki 365.");
      return;
    }
    create.mutate(
      { expiresInDays: value },
      {
        onSuccess: (link) => {
          setCreating(false);
          setCreated(link);
          setCreateError(undefined);
        },
        onError: (e) => {
          const { fields, form } = formErrors(e);
          setCreateError(fields.expiresInDays ?? form);
        },
      },
    );
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switch label="Tik galiojančios" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
        <Button variant="hack" icon={Link2} glitch onClick={() => setCreating(true)}>
          Sugeneruoti nuorodą
        </Button>
      </div>

      <Card className="p-3 md:p-4">
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <LoadingState />
        ) : (
          <DataTable
            caption="Peržiūros nuorodos"
            rows={data.items}
            rowKey={(l) => l.id}
            empty={
              <EmptyState art="folder" title="Nuorodų nėra">
                Sugeneruokite nuorodą ir nusiųskite užsakovui – jis matys darbo eigą be paskyros.
              </EmptyState>
            }
            columns={[
              { key: "created", header: "Sukurta", mobile: "title", cell: (l) => <span className="tabular">{formatDate(l.createdAt)}</span> },
              { key: "expires", header: "Galioja iki", cell: (l) => <span className="tabular">{formatDate(l.expiresAt)}</span> },
              { key: "viewed", header: "Paskutinė peržiūra", cell: (l) => <span className="tabular">{formatDateTime(l.lastViewedAt)}</span> },
              {
                key: "state",
                header: "Būsena",
                cell: (l) => {
                  const [label, tone] = shareState(l);
                  return <Badge tone={tone}>{label}</Badge>;
                },
              },
              {
                key: "revoke",
                header: <span className="sr-only">Veiksmai</span>,
                mobile: "aside",
                className: "w-28 text-right",
                cell: (l) =>
                  l._links.revoke ? (
                    <Button size="sm" variant="danger" icon={Ban} onClick={() => setRevoking(l)}>
                      Atšaukti
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </Card>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Nauja peržiūros nuoroda"
        size="sm"
        onSubmit={submit}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={create.isPending}>
              Atšaukti
            </Button>
            <Button type="submit" variant="hack" icon={Link2} loading={create.isPending}>
              Sugeneruoti
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <p className="text-sm text-muted">Nuoroda leis tik skaityti: užduočių būsenas, valandas ir sumą. Ją galėsite bet kada atšaukti.</p>
          <Field label="Galioja, dienų" error={createError}>
            {(p) => <Input {...p} type="number" inputMode="numeric" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />}
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={created !== null}
        onClose={() => setCreated(null)}
        title="Nuoroda sukurta"
        footer={<Button onClick={() => setCreated(null)}>Uždaryti</Button>}
      >
        {created && (
          <div className="grid gap-4">
            <FormAlert tone="warn">Nuoroda rodoma tik kartą – nukopijuokite ją dabar. Vėliau ją galėsite tik atšaukti.</FormAlert>
            <CopyField label="Peržiūros nuoroda" value={created.url} />
            <p className="text-sm text-muted">Galioja iki {formatDate(created.expiresAt)} · tik skaitymas</p>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title="Atšaukti nuorodą?"
        confirmLabel="Atšaukti nuorodą"
        loading={revoke.isPending}
        onConfirm={() =>
          revoking &&
          revoke.mutate(revoking.id, {
            onSuccess: () => {
              toast.success("> nuoroda_atsaukta [204]", "Nuoroda nebeatidaro projekto.");
              setRevoking(null);
            },
            onError: (e) => {
              toast.fromError(e);
              setRevoking(null);
            },
          })
        }
      >
        Kas turi šią nuorodą, nebegalės matyti projekto. Atšauktos nuorodos atkurti negalima.
      </ConfirmDialog>
    </div>
  );
}
