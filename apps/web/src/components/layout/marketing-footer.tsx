import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ApiHealth } from "./api-health";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
  {
    title: "Produktas",
    links: [
      { href: "/projects", label: "Aikštelė" },
      { href: "/#kaip-veikia", label: "Kaip veikia" },
      { href: "/register", label: "Registruotis" },
    ],
  },
  {
    title: "Ištekliai",
    links: [
      { href: "/api/docs/", label: "API dokumentacija", external: true },
      { href: "/api/openapi.json", label: "OpenAPI", external: true },
    ],
  },
  {
    title: "Paskyra",
    links: [
      { href: "/login", label: "Prisijungti" },
      { href: "/app", label: "Programa" },
    ],
  },
];

/** Footer of the public pages: a short pitch, link columns and the API status. */
export function MarketingFooter() {
  return (
    <footer className="mt-auto border-t border-border pt-12 pb-[calc(32px+env(safe-area-inset-bottom))] text-[13px] text-muted">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-[clamp(16px,4vw,32px)] md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="grid content-start gap-3">
          <Logo />
          <p className="max-w-[32ch]">Darbų aikštelė ir skaidri atliktų darbų laiko apskaita.</p>
          <ApiHealth />
        </div>
        <div className="grid grid-cols-2 gap-8 md:contents">
          {COLUMNS.map((column) => (
            <div key={column.title} className="grid content-start gap-2.5">
              <h2 className="font-pixel text-[11px] tracking-[0.08em] text-fg uppercase">{column.title}</h2>
              <ul className="grid gap-1.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-fg">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="transition-colors hover:text-fg">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-10 w-full max-w-6xl px-[clamp(16px,4vw,32px)] text-xs">
        © 2026 Hourly · KTU T120B165 laboratorinis darbas
      </p>
    </footer>
  );
}
