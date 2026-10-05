"use client";

import { Suspense } from "react";
import { Marketplace } from "@/components/domain/marketplace";
import { PageHeader } from "@/components/layout/states";

/** The marketplace inside the app frame; a card opens the project workspace. */
export default function AppMarketplacePage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        label="aikštelė"
        title="Paskelbti projektai"
        description="Projektai, kuriems ieškoma specialisto. Atidarykite projektą, kad pateiktumėte pasiūlymą."
      />
      <Suspense>
        <Marketplace basePath="/app/projects" />
      </Suspense>
    </div>
  );
}
