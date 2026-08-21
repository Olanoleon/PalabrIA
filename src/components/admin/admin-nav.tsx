import type { AdminNavItem } from "@/components/admin/admin-bottom-nav";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

/**
 * `match` lists every route that belongs to a tab, because the deeper screens
 * do not all live under their tab's href — editing a unit is /admin/unit/[id]
 * but belongs to Contenido.
 */
export function adminNav(lang: Lang): AdminNavItem[] {
  const d = adminT(lang);
  return [
    { href: "/admin", label: d.navPanel, icon: "panel", match: ["/admin"] },
    {
      href: "/admin/learners",
      label: d.navLearners,
      icon: "learners",
      match: ["/admin/learners"],
    },
    {
      href: "/admin/content",
      label: d.navContent,
      icon: "content",
      match: ["/admin/content", "/admin/unit"],
    },
  ];
}

/**
 * `inOrgMode` changes what the content tab is called, because it changes what
 * the tab contains: the Global Template normally, but that organization's own
 * content once the Super Admin has entered Organization Mode. Calling it
 * "Global" in both would assert the opposite of the truth in the one mode where
 * the distinction matters most.
 */
export function superNav(lang: Lang, inOrgMode = false): AdminNavItem[] {
  const d = adminT(lang);
  return [
    { href: "/super", label: d.navPanel, icon: "panel", match: ["/super"] },
    {
      href: "/super/organizations",
      label: d.navOrganizations,
      icon: "organizations",
      match: ["/super/organizations"],
    },
    {
      href: "/super/learners",
      label: d.navLearners,
      icon: "learners",
      match: ["/super/learners"],
    },
    {
      href: "/super/payments",
      label: d.navPayments,
      icon: "payments",
      match: ["/super/payments"],
    },
    {
      href: "/super/content",
      label: inOrgMode ? d.navContent : d.navGlobal,
      icon: "content",
      match: ["/super/content", "/super/unit"],
    },
    {
      href: "/super/settings",
      label: d.navSettings,
      icon: "settings",
      match: ["/super/settings"],
    },
  ];
}
