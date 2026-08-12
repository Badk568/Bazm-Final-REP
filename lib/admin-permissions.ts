import type { Role } from "./types.ts";

export const adminSections = [
  { slug: "dashboard", label: "Dashboard", href: "/admin", roles: ["ADMIN", "EVENT_MANAGER", "DOOR_STAFF"] },
  { slug: "events", label: "Events", href: "/admin/events", roles: ["ADMIN", "EVENT_MANAGER"] },
  { slug: "categories", label: "Categories", href: "/admin/categories", roles: ["ADMIN"] },
  { slug: "orders", label: "Orders", href: "/admin/orders", roles: ["ADMIN", "EVENT_MANAGER"] },
  { slug: "payment-reviews", label: "Payment Reviews", href: "/admin/payment-reviews", roles: ["ADMIN", "EVENT_MANAGER"] },
  { slug: "tickets", label: "Tickets", href: "/admin/tickets", roles: ["ADMIN", "EVENT_MANAGER"] },
  { slug: "check-in", label: "Check-in", href: "/admin/check-in", roles: ["ADMIN", "EVENT_MANAGER", "DOOR_STAFF"] },
  { slug: "reports", label: "Reports", href: "/admin/reports", roles: ["ADMIN", "EVENT_MANAGER"] },
  { slug: "settings", label: "Settings", href: "/admin/settings", roles: ["ADMIN"] },
  { slug: "staff", label: "Staff", href: "/admin/staff", roles: ["ADMIN"] },
] as const satisfies ReadonlyArray<{ slug: string; label: string; href: string; roles: readonly Role[] }>;

export type AdminSection = (typeof adminSections)[number]["slug"];
export const visibleSections = (role: Role) => adminSections.filter((section) => (section.roles as readonly Role[]).includes(role));
export const mayOpenSection = (role: Role, slug: string) => adminSections.some((section) => section.slug === slug && (section.roles as readonly Role[]).includes(role));
