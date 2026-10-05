"use client";

import { KeyRound, LogOut, Save } from "lucide-react";
import { useState } from "react";
import { FormAlert } from "@/components/layout/form-alert";
import { ErrorState, LoadingState, PageHeader } from "@/components/layout/states";
import { Avatar } from "@/components/layout/user-menu";
import { RoleSticker } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, KeyValues } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { formErrors } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { useMe, useUpdateMe } from "@/lib/queries/system";
import type { CurrentUser } from "@hourly/shared";

/** The own account (`GET`/`PATCH /auth/me`): name, bio, password, and signing out. */
export default function SettingsPage() {
  const { data: me, error, isPending, refetch } = useMe();
  const { logout } = useAuth();
  const toast = useToast();
  const [changingPassword, setChangingPassword] = useState(false);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isPending) return <LoadingState rows={6} />;

  return (
    <div className="grid gap-8">
      <PageHeader label="paskyra" title="Paskyra" description="Vardas ir aprašymas matomi kitiems naudotojams jūsų profilyje." />
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start">
        <ProfileForm key={me.displayName + (me.bio ?? "")} me={me} />
        <div className="grid gap-5">
          <Card className="grid gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar name={me.displayName} className="size-12 text-sm" />
              <div className="grid gap-1">
                <span className="font-semibold">{me.displayName}</span>
                <RoleSticker role={me.role} className="w-fit" />
              </div>
            </div>
            <KeyValues
              rows={[
                ["El. paštas", me.email],
                ["Narys nuo", formatDate(me.createdAt)],
              ]}
            />
          </Card>
          <Card className="grid gap-3">
            <h2 className="font-semibold">Saugumas</h2>
            <p className="text-sm text-muted">Pakeitus slaptažodį, kituose įrenginiuose bus atsijungta.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={KeyRound} onClick={() => setChangingPassword(true)}>
                Keisti slaptažodį
              </Button>
              <Button
                variant="danger"
                icon={LogOut}
                onClick={async () => {
                  await logout().catch(toast.fromError);
                  toast.success("> atsijungta [204]", "Iki pasimatymo.");
                }}
              >
                Atsijungti
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <PasswordDialog open={changingPassword} onClose={() => setChangingPassword(false)} />
    </div>
  );
}

function ProfileForm({ me }: { me: CurrentUser }) {
  const update = useUpdateMe();
  const toast = useToast();
  const [name, setName] = useState(me.displayName);
  const [bio, setBio] = useState(me.bio ?? "");
  const [errors, setErrors] = useState<{ displayName?: string; bio?: string; form?: string }>({});

  const changed = name.trim() !== me.displayName || bio.trim() !== (me.bio ?? "");

  return (
    <Card>
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (trimmed.length < 2 || trimmed.length > 80) return setErrors({ displayName: "Nuo 2 iki 80 simbolių." });
          if (bio.length > 2000) return setErrors({ bio: "Ne daugiau kaip 2000 simbolių." });
          setErrors({});
          update.mutate(
            { displayName: trimmed, bio: bio.trim() || null },
            {
              onSuccess: () => toast.success("> paskyra_atnaujinta [200]", "Profilis išsaugotas."),
              onError: (error) => {
                const { fields, form } = formErrors(error);
                setErrors({ ...fields, form });
              },
            },
          );
        }}
      >
        <h2 className="font-semibold">Profilis</h2>
        {errors.form && <FormAlert>{errors.form}</FormAlert>}
        <Field label="Vardas arba įmonės pavadinimas" error={errors.displayName}>
          {(p) => <Input {...p} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Apie mane" error={errors.bio} hint={`${bio.length} / 2000`}>
          {(p) => (
            <Textarea {...p} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Patirtis, technologijos, kokių darbų ieškote." className="min-h-[140px]" />
          )}
        </Field>
        <Button type="submit" variant="hack" icon={Save} loading={update.isPending} disabled={!changed} className="w-fit">
          Išsaugoti
        </Button>
      </form>
    </Card>
  );
}

function PasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const update = useUpdateMe();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [errors, setErrors] = useState<{ currentPassword?: string; password?: string; repeat?: string; form?: string }>({});

  const close = () => {
    setCurrent("");
    setNext("");
    setRepeat("");
    setErrors({});
    onClose();
  };

  const submit = () => {
    const found: typeof errors = {};
    if (!current) found.currentPassword = "Įveskite dabartinį slaptažodį.";
    if (next.length < 8 || next.length > 128) found.password = "Nuo 8 iki 128 simbolių.";
    if (repeat !== next) found.repeat = "Slaptažodžiai nesutampa.";
    setErrors(found);
    if (Object.keys(found).length) return;

    update.mutate(
      { password: next, currentPassword: current },
      {
        onSuccess: () => {
          toast.success("> slaptazodis_pakeistas [200]", "Kituose įrenginiuose atsijungta.");
          close();
        },
        onError: (error) => {
          const { fields, form } = formErrors(error, { currentPassword: "Dabartinis slaptažodis neteisingas.", password: "Nuo 8 iki 128 simbolių." });
          setErrors({ ...fields, form });
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Keisti slaptažodį"
      size="sm"
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={update.isPending}>
            Atšaukti
          </Button>
          <Button type="submit" variant="hack" icon={KeyRound} loading={update.isPending}>
            Pakeisti
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form && <FormAlert>{errors.form}</FormAlert>}
        <Field label="Dabartinis slaptažodis" error={errors.currentPassword}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
        </Field>
        <Field label="Naujas slaptažodis" error={errors.password} hint="Bent 8 simboliai.">
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
        </Field>
        <Field label="Pakartokite naują slaptažodį" error={errors.repeat}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
}
