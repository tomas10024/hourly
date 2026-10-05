"use client";

import { CrashScreen } from "@/components/layout/error-screens";

/** A page inside the app crashed: the frame stays, the page offers a retry. */
export default function AppError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <CrashScreen {...props} />;
}
