"use client";

import { PageHeader } from "@/components/layout/states";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";

// TEMPORARY: the overview is built in stage E2 (running session, weekly hours, recent tasks).
export default function OverviewPage() {
  const { user } = useAuth();
  return (
    <div className="grid gap-8">
      <PageHeader label="apžvalga" title={`Sveiki, ${user?.displayName ?? ""}`} />
      <Card>
        <EmptyState art="clock" title="Apžvalga kuriama">
          Čia bus vykdoma sesija, savaitės valandos ir naujausios užduotys.
        </EmptyState>
      </Card>
    </div>
  );
}
