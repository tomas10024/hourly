import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Prisijungimas" };

export default function LoginPage() {
  // The form reads `?next=` and `?reason=`; search params need a Suspense boundary.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
