import type { NavItem } from "@/components/admin/shell";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

export function adminNav(lang: Lang): NavItem[] {
  const d = adminT(lang);
  return [
    { href: "/admin", label: d.navPanel },
    { href: "/admin/learners", label: d.navLearners },
    { href: "/admin/content", label: d.navContent },
  ];
}

export function superNav(lang: Lang): NavItem[] {
  const d = adminT(lang);
  return [
    { href: "/super", label: d.navPanel },
    { href: "/super/organizations", label: d.navOrganizations },
    { href: "/super/learners", label: d.navLearners },
    { href: "/super/payments", label: d.navPayments },
    { href: "/super/content", label: d.navContent },
    { href: "/super/settings", label: d.navSettings },
  ];
}
