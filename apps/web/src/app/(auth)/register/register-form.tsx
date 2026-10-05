"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/layout/form-alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, RadioCards } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, fieldErrors } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { safeNext } from "@/lib/next-path";

type Role = "CLIENT" | "SPECIALIST";
type Errors = Partial<Record<"displayName" | "email" | "password" | "terms" | "form", string>>;

/** The same limits as `RegisterInput` in @hourly/shared, worded in Lithuanian. */
function validate(values: { displayName: string; email: string; password: string; terms: boolean }): Errors {
  const errors: Errors = {};
  const name = values.displayName.trim();
  if (name.length < 2 || name.length > 80) errors.displayName = "Nuo 2 iki 80 simbolių.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Įveskite tikrą el. pašto adresą.";
  if (values.password.length < 8) errors.password = "Bent 8 simboliai.";
  else if (values.password.length > 128) errors.password = "Ne daugiau kaip 128 simboliai.";
  if (!values.terms) errors.terms = "Reikia sutikti su taisyklėmis.";
  return errors;
}

/** Server-side field errors (422) mapped to the same Lithuanian messages. */
const SERVER_FIELD: Record<string, string> = {
  displayName: "Nuo 2 iki 80 simbolių.",
  email: "Įveskite tikrą el. pašto adresą.",
  password: "Nuo 8 iki 128 simbolių.",
};

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SPECIALIST");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const next = safeNext(params.get("next"));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate({ displayName, email, password, terms });
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const user = await register({ displayName: displayName.trim(), email: email.trim(), password, role });
      toast.success("> paskyra_sukurta [201]", `Sveiki, ${user.displayName}.`);
      router.replace(next);
    } catch (error) {
      const fields = fieldErrors(error);
      const mapped: Errors = {};
      for (const key of Object.keys(fields)) {
        if (key in SERVER_FIELD) mapped[key as "displayName" | "email" | "password"] = SERVER_FIELD[key];
      }
      if (error instanceof ApiRequestError && error.code === "EMAIL_TAKEN") mapped.email = errorMessage(error);
      else if (Object.keys(mapped).length === 0) mapped.form = errorMessage(error);
      setErrors(mapped);
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-7">
      <div className="grid gap-2">
        <span className="label">{"// registracija"}</span>
        <h1 className="heading-display text-[clamp(40px,6vw,56px)]">Sukurti paskyrą</h1>
        <p className="text-sm text-muted">Skelbkite darbus arba registruokite atliktą darbą – vienoje vietoje.</p>
      </div>

      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {errors.form && <FormAlert>{errors.form}</FormAlert>}

        <Field label="Vardas arba įmonės pavadinimas" error={errors.displayName}>
          {(p) => (
            <Input
              {...p}
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jonas Jonaitis"
            />
          )}
        </Field>
        <Field label="El. paštas" error={errors.email}>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vardas@pavyzdys.lt"
            />
          )}
        </Field>
        <Field label="Slaptažodis" error={errors.password} hint={errors.password ? undefined : "Bent 8 simboliai."}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <RadioCards
          name="role"
          legend="Kaip naudosite Hourly?"
          value={role}
          onChange={setRole}
          options={[
            { value: "CLIENT", label: "Užsakovas", description: "skelbiu darbus" },
            { value: "SPECIALIST", label: "Specialistas", description: "atlieku darbus" },
          ]}
        />
        <div className="grid gap-1.5">
          <Checkbox
            label="Sutinku su naudojimo taisyklėmis"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            aria-invalid={errors.terms ? true : undefined}
          />
          {errors.terms && (
            <p className="flex gap-1.5 text-[12.5px] text-bad" role="alert">
              <span className="font-mono" aria-hidden>&gt;</span>
              {errors.terms}
            </p>
          )}
        </div>

        <Button type="submit" variant="hack" icon={UserPlus} loading={busy} glitch className="mt-1 w-full">
          Registruotis
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Jau turite paskyrą?{" "}
        <Link
          href={next === "/app" ? "/login" : `/login?next=${encodeURIComponent(next)}`}
          className="text-fg underline-offset-4 hover:underline"
        >
          Prisijungti
        </Link>
      </p>
    </div>
  );
}
