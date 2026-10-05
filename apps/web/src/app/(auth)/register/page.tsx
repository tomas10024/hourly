import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registracija" };

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
