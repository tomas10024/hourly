import { NotFoundScreen } from "@/components/layout/error-screens";

/** Unknown address inside the app: the 404 keeps the app frame and menu. */
export default function AppNotFound() {
  return <NotFoundScreen homeHref="/app" homeLabel="Į apžvalgą" />;
}
