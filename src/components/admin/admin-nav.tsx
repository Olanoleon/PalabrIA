import type { NavItem } from "@/components/admin/shell";

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/learners", label: "Aprendices" },
  { href: "/admin/content", label: "Contenido" },
];

export const SUPER_NAV: NavItem[] = [
  { href: "/super", label: "Panel" },
  { href: "/super/organizations", label: "Organizaciones" },
  { href: "/super/learners", label: "Aprendices" },
  { href: "/super/payments", label: "Pagos" },
  { href: "/super/content", label: "Contenido" },
  { href: "/super/settings", label: "Ajustes" },
];
