"use client";

import { CrashScreen } from "@/components/layout/error-screens";

/** Last resort for crashes outside the app frame (public pages, login). */
export default function RootError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <CrashScreen {...props} />
    </main>
  );
}
