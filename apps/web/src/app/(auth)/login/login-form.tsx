"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/layout/form-alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, fieldErrors } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { safeNext } from "@/lib/next-path";

/** Why the user is here again (`?reason=` set when the API ended the sign-in). */
const REASONS: Record<string, string> = {
  SESSION_REVOKED: "Prisijungimas baigėsi: atsijungta kitame lange arba pakeistas slaptažodis.",
  TOKEN_EXPIRED: "Prisijungimas baigėsi. Prisijunkite iš naujo.",
  INVALID_TOKEN: "Prisijungimas nebegalioja. Prisijunkite iš naujo.",
  ACCOUNT_BLOCKED: "Paskyra užblokuota. Kreipkitės į administratorių.",
};

/** One-click sign-in for the defence, only with NEXT_PUBLIC_DEMO_MODE=true (accounts from the seed). */
const DEMO_ACCOUNTS = [
  ["Užsakovas", "uzsakovas@hourly.lt"],
  ["Specialistas", "specialistas@hourly.lt"],
  ["Administratorius", "admin@hourly.lt"],
  ["Užblokuotas", "blokuotas@hourly.lt"],
] as const;
const DEMO_PASSWORD = "slaptazodis123";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const next = safeNext(params.get("next"));
  const reason = REASONS[params.get("reason") ?? ""];

  const submit = async (credentials = { email, password }) => {
    const found: typeof errors = {};
    if (!credentials.email.trim()) found.email = "Įveskite el. paštą.";
    if (!credentials.password) found.password = "Įveskite slaptažodį.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const user = await login({ email: credentials.email.trim(), password: credentials.password });
      toast.success("> prisijungta [200]", `Sveiki, ${user.displayName}.`);
      router.replace(next);
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors({
        email: fields.email ? "Neteisingas el. pašto formatas." : undefined,
        form: Object.keys(fields).length ? undefined : errorMessage(error),
      });
      if (error instanceof ApiRequestError && error.code === "INVALID_CREDENTIALS") setPassword("");
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <div className="grid gap-7">
      <div className="grid gap-2">
        <span className="label">{"// prisijungimas"}</span>
        <h1 className="heading-display text-[clamp(40px,6vw,56px)]">Sveiki sugrįžę</h1>
        <p className="text-sm text-muted">Prisijunkite, kad matytumėte savo projektus ir darbo laiką.</p>
      </div>

      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {reason && !errors.form && <FormAlert tone="warn">{reason}</FormAlert>}
        {errors.form && <FormAlert>{errors.form}</FormAlert>}

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
        <Field label="Slaptažodis" error={errors.password}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        <Button type="submit" variant="hack" icon={LogIn} loading={busy} glitch className="mt-1 w-full">
          Prisijungti
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Neturite paskyros?{" "}
        <Link
          href={next === "/app" ? "/register" : `/register?next=${encodeURIComponent(next)}`}
          className="text-fg underline-offset-4 hover:underline"
        >
          Registruotis
        </Link>
      </p>

      {DEMO_MODE && (
        <div className="grid gap-2.5 border-t border-border pt-5">
          <span className="label">{"// demonstracinės paskyros"}</span>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(([label, demoEmail]) => (
              <Button
                key={demoEmail}
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setEmail(demoEmail);
                  setPassword(DEMO_PASSWORD);
                  void submit({ email: demoEmail, password: DEMO_PASSWORD });
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
