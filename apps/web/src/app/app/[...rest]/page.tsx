import { notFound } from "next/navigation";

/**
 * Any `/app/...` address that has no page. Calling `notFound()` here (instead
 * of letting the router fall through to the root 404) shows `app/not-found.tsx`
 * inside the app frame, so the user keeps the menu.
 */
export default function UnknownAppPage() {
  notFound();
}
