import { Eye } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";

/*
 * The token is in the address. It must not reach search engines, and it must
 * not leak to other sites through the Referer header when the reader follows
 * a link. `next.config.ts` sends the same rules as HTTP headers; these meta
 * tags repeat them inside the page.
 */
export const metadata: Metadata = {
  title: "Projekto eiga",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * What a client without an account sees through a share link: a read-only
 * bar on top, the project's progress, and a quiet "made with Hourly" below.
 */
export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-[clamp(16px,4vw,32px)]">
          <Logo />
          <Badge tone="data" className="ml-auto">
            <Eye aria-hidden className="size-3.5" />
            Tik skaitymui
          </Badge>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-[clamp(16px,4vw,32px)] py-10">{children}</main>
      <footer className="border-t border-border py-5 text-center text-xs text-muted">
        Sukurta su <span className="font-semibold text-fg">Hourly</span> – skaidri darbų laiko apskaita
      </footer>
    </div>
  );
}
