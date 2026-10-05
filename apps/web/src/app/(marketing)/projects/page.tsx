import type { Metadata } from "next";
import { Suspense } from "react";
import { Marketplace } from "@/components/domain/marketplace";

export const metadata: Metadata = {
  title: "Aikštelė",
  description: "Paskelbti projektai, kuriems ieškoma specialistų.",
};

export default function MarketplacePage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-[clamp(16px,4vw,32px)] py-14">
      <header className="grid gap-3">
        <span className="label">{"// aikštelė"}</span>
        <h1 className="heading-display text-[clamp(44px,7vw,72px)]">Projektai, laukiantys specialisto</h1>
        <p className="max-w-[56ch] text-muted">
          Užsakovų paskelbti darbai. Prisijungę kaip specialistas galite pateikti pasiūlymą su kaina ir terminu.
        </p>
      </header>
      <Suspense>
        <Marketplace basePath="/projects" />
      </Suspense>
    </div>
  );
}
