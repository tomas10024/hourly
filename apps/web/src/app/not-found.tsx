import type { Metadata } from "next";
import { NotFoundScreen } from "@/components/layout/error-screens";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Puslapis nerastas" };

/** Any address that matches no route. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-[clamp(16px,4vw,32px)]">
        <Logo />
      </header>
      <main className="grid flex-1 place-items-center px-4">
        <NotFoundScreen />
      </main>
    </div>
  );
}
