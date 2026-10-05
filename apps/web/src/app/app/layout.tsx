import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: { default: "Programa", template: "%s · Hourly" },
  // Private pages: nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/** Everything a signed-in user does lives under `/app`. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
