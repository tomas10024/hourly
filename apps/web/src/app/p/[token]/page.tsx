import { EmptyState } from "@/components/ui/empty-state";

// TEMPORARY: the shared project view is built in stage E1 (`GET /public/projects/{token}`).
export default function SharedProjectPage() {
  return (
    <EmptyState art="clock" title="Projekto eiga kuriama">
      Čia užsakovas matys užduočių būsenas, sukauptas valandas ir sumą.
    </EmptyState>
  );
}
