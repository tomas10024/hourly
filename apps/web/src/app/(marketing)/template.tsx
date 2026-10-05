import type { ReactNode } from "react";

/** The public pages fade in on each navigation, like the app (`.page-enter`). */
export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
