import type { ReactNode } from "react";

/**
 * Wraps every page of the app (inside the persistent frame of `layout.tsx`).
 * A template, unlike a layout, is created anew on each navigation, so the
 * page fades up every time it is entered (`.page-enter`, animations.css).
 */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
