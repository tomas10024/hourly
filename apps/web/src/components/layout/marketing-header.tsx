"use client";

import { BookOpen, Briefcase, LayoutGrid, Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/lib/auth";
import { cx } from "@/lib/cx";

const NAV = [
  { href: "/projects", label: "Aikštelė", icon: Briefcase },
  { href: "/#kaip-veikia", label: "Kaip veikia", icon: Sparkles },
  { href: "/api/docs/", label: "API", icon: BookOpen, external: true },
];

/**
 * Header of the public pages (Resend): sticky, see-through with a blur, and a
 * hairline border only once the page has scrolled. Below the breakpoint the
 * links fold into a hamburger panel that slides open under the bar.
 */
export function MarketingHeader() {
  const pathname = usePathname();
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signedIn = status === "authenticated";
  const auth = signedIn ? (
    <ButtonLink href="/app" variant="hack" icon={LayoutGrid} glitch>
      Į programą
    </ButtonLink>
  ) : (
    <>
      <ButtonLink href="/login" variant="ghost">
        Prisijungti
      </ButtonLink>
      <ButtonLink href="/register">Registruotis</ButtonLink>
    </>
  );

  return (
    <header
      className={cx(
        "sticky top-[env(safe-area-inset-top)] z-40 border-b bg-black/70 backdrop-blur-md transition-colors duration-200",
        scrolled || open ? "border-border" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-[clamp(16px,4vw,32px)]">
        <Logo />

        <nav aria-label="Pagrindinis meniu" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon, external }) => {
            const active = !external && pathname.startsWith(href.split("#")[0]) && href !== "/#kaip-veikia";
            const className = cx(
              "group inline-flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-white/5",
              active ? "text-fg" : "text-muted hover:text-fg",
            );
            const content = (
              <>
                <Icon aria-hidden className="size-4 transition-[color,transform] duration-150 group-hover:translate-x-px group-hover:text-hack" />
                {label}
              </>
            );
            return external ? (
              <a key={href} href={href} target="_blank" rel="noreferrer" className={className}>
                {content}
              </a>
            ) : (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={className}>
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">{auth}</div>

        <button
          type="button"
          aria-label={open ? "Uždaryti meniu" : "Atidaryti meniu"}
          aria-expanded={open}
          aria-controls="marketing-menu"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto grid size-[38px] place-items-center rounded-button border border-border-strong text-fg transition-colors hover:border-white/30 md:hidden"
        >
          {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
        </button>
      </div>

      {/* Mobile panel: grid rows 0fr -> 1fr animates the height without measuring it. */}
      <div
        id="marketing-menu"
        className={cx(
          "grid transition-[grid-template-rows] duration-300 ease-snap md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <nav aria-label="Mobilusis meniu" className="grid gap-1 px-4 pt-1 pb-4">
            {NAV.map(({ href, label, icon: Icon, external }) => (
              <a
                key={href}
                href={href}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] hover:bg-white/5"
              >
                <Icon aria-hidden className="size-4 text-muted" />
                {label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 [&>*]:w-full">{auth}</div>
          </nav>
        </div>
      </div>
    </header>
  );
}
