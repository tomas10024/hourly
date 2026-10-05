import type { ReactNode } from "react";
import { AuthVisual } from "@/components/layout/auth-visual";
import { Logo } from "@/components/ui/logo";

/**
 * Login and registration: only the logo above, the form on the left, a
 * picture of the product on the right (hidden below the breakpoint), and a
 * single line below. Nothing to wander off to while signing in.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-[clamp(16px,4vw,32px)]">
        <Logo />
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-[clamp(16px,4vw,32px)] py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:py-12">
        <div className="w-full max-w-[440px] justify-self-center md:justify-self-start">{children}</div>
        <AuthVisual />
      </main>
      <footer className="mx-auto w-full max-w-6xl px-[clamp(16px,4vw,32px)] py-5 text-xs text-muted">
        © 2026 Hourly · KTU T120B165
      </footer>
    </div>
  );
}
