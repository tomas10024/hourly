"use client";

import { Menu, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Logo, LogoMark } from "@/components/ui/logo";
import { Skeleton, BlockProgress } from "@/components/ui/spinner";
import { RoleSticker, roleLabel } from "@/components/ui/badge";
import { loginPath, useAuth } from "@/lib/auth";
import { cx } from "@/lib/cx";
import { useApiRoot } from "@/lib/queries/system";
import { ApiHealth } from "./api-health";
import { activeItem, navFromLinks, type NavItem } from "./app-nav";
import { TimerPill } from "./timer-pill";
import { Avatar, UserMenu } from "./user-menu";

/**
 * The frame of every `/app` page.
 *
 *   ≥ 768px  side bar (240px, icon + label per item) | top bar + page + footer
 *   < 768px  top bar with a hamburger; the same menu slides in from the left
 *
 * It also guards the area on the client: `proxy.ts` has already turned away
 * visitors without a session marker, and this decides for the rest once the
 * session has been restored.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.status !== "guest" || auth.reason === "expired") return;
    router.replace(auth.reason === "logout" ? "/" : loginPath(pathname));
  }, [auth, pathname, router]);

  if (auth.status === "unavailable") {
    return (
      <Centered>
        <EmptyState
          art="signal"
          title="Serveris nepasiekiamas"
          action={
            <Button variant="secondary" icon={RefreshCw} onClick={() => window.location.reload()}>
              Bandyti dar kartą
            </Button>
          }
        >
          Nepavyko susisiekti su API, todėl nežinome, ar esate prisijungę. Patikrinkite ryšį.
        </EmptyState>
      </Centered>
    );
  }

  if (auth.status !== "authenticated") {
    return (
      <Centered>
        <div className="grid w-56 justify-items-center gap-5">
          <LogoMark className="size-9" />
          <BlockProgress className="w-full" label="Atkuriamas prisijungimas" />
        </div>
      </Centered>
    );
  }

  return <Shell>{children}</Shell>;
}

function Centered({ children }: { children: ReactNode }) {
  return <main className="grid min-h-dvh place-items-center p-6">{children}</main>;
}

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const root = useApiRoot();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = navFromLinks(root.data?._links, user?.role);
  const current = activeItem(items, pathname);

  return (
    <div className="flex min-h-dvh">
      {/* Side bar: wide screens only. */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface/60 md:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/app" />
        </div>
        <SideNav items={items} loading={root.isPending} pathname={pathname} />
        <div className="mt-auto flex items-center gap-3 border-t border-border px-5 py-4">
          {user && (
            <>
              <Avatar name={user.displayName} className="size-9 text-xs" />
              <div className="grid min-w-0">
                <span className="truncate text-[13px] font-semibold">{user.displayName}</span>
                <span className="text-xs text-muted">{roleLabel(user.role)}</span>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-black/75 px-[clamp(16px,3vw,32px)] backdrop-blur-md">
          <Button
            variant="secondary"
            size="icon"
            icon={Menu}
            aria-label="Atidaryti meniu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="md:hidden"
          />
          <span className="truncate text-[17px] font-semibold tracking-tight">{current?.label ?? "Hourly"}</span>
          <div className="ml-auto flex items-center gap-3">
            <TimerPill />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-[clamp(16px,3vw,32px)] py-8">{children}</main>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-[clamp(16px,3vw,32px)] py-3 text-xs text-muted">
          <span className="font-mono">Hourly v0.3</span>
          <ApiHealth />
          <a href="/api/docs/" target="_blank" rel="noreferrer" className="transition-colors hover:text-fg">
            API dokumentacija
          </a>
        </footer>
      </div>

      {/* The same menu on a phone. */}
      <Drawer open={menuOpen} side="left" title="Meniu" onClose={() => setMenuOpen(false)}>
        <div className="-mx-3 grid gap-4">
          <SideNav items={items} loading={root.isPending} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          {user && (
            <div className="flex items-center gap-3 border-t border-border px-3 pt-4">
              <Avatar name={user.displayName} className="size-9 text-xs" />
              <div className="grid min-w-0 gap-1">
                <span className="truncate text-sm font-semibold">{user.displayName}</span>
                <RoleSticker role={user.role} className="w-fit" />
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}

function SideNav({
  items,
  loading,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  loading: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  const current = activeItem(items, pathname);
  const sections: Array<[NavItem["section"], string | null]> = [
    ["main", null],
    ["admin", "Administravimas"],
  ];

  return (
    <nav aria-label="Programos meniu" className="grid gap-5 px-3 py-2">
      {sections.map(([section, title]) => {
        const list = items.filter((item) => item.section === section);
        if (list.length === 0) return null;
        return (
          <div key={section} className="grid gap-0.5">
            {title && <span className="label px-3 pb-1.5">{title}</span>}
            {list.map(({ href, label, icon: Icon }) => {
              const active = current?.href === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "group flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition-colors duration-150",
                    active ? "bg-white/[0.07] font-medium text-fg" : "text-muted hover:bg-white/[0.04] hover:text-fg",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cx(
                      "size-4 transition-[color,transform] duration-150 group-hover:translate-x-px",
                      active ? "text-hack" : "group-hover:text-fg",
                    )}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        );
      })}
      {loading && (
        <div className="grid gap-3 px-3 pt-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-3/4" />
          ))}
        </div>
      )}
    </nav>
  );
}
