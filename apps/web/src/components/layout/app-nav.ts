import type { Links, Role } from "@hourly/shared";
import {
  Briefcase,
  Clock,
  FolderOpen,
  Folders,
  LayoutGrid,
  Send,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section: "main" | "admin";
};

/**
 * The side menu, built from the links of the API entry point (`GET /api`).
 * The API decides what each role may reach - a client gets no `sessions`
 * link, a specialist no `users` link - and the menu simply mirrors that, so
 * the client keeps no copy of the role rules. Only the overview is always
 * there.
 */
export function navFromLinks(links: Links | undefined, role: Role | undefined): NavItem[] {
  const items: NavItem[] = [{ href: "/app", label: "Apžvalga", icon: LayoutGrid, section: "main" }];
  if (!links) return items;

  if (links.projects && role !== "ADMIN") {
    items.push({ href: "/app/projects", label: "Projektai", icon: FolderOpen, section: "main" });
  }
  if (links.marketplace) {
    items.push({ href: "/app/marketplace", label: "Aikštelė", icon: Briefcase, section: "main" });
  }
  if (links.proposals) {
    items.push({ href: "/app/proposals", label: "Pasiūlymai", icon: Send, section: "main" });
  }
  if (links.sessions) {
    items.push({ href: "/app/sessions", label: "Darbo žurnalas", icon: Clock, section: "main" });
  }
  if (links.me) {
    items.push({ href: "/app/settings", label: "Paskyra", icon: UserRound, section: "main" });
  }
  if (links.users) {
    items.push({ href: "/app/admin/users", label: "Naudotojai", icon: Users, section: "admin" });
  }
  if (links.projects && role === "ADMIN") {
    items.push({ href: "/app/admin/projects", label: "Visi projektai", icon: Folders, section: "admin" });
  }
  return items;
}

/** The item a path belongs to: the longest matching prefix (`/app` only on itself). */
export function activeItem(items: NavItem[], pathname: string): NavItem | undefined {
  return items
    .filter((item) => (item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
