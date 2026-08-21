"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/components/admin/shell";
import {
  ContentIcon,
  LearnersIcon,
  OrganizationIcon,
  PanelIcon,
  PaymentIcon,
  SettingsIcon,
} from "@/components/ui/icons";

/**
 * Icons are named rather than passed. A server page cannot hand a component
 * function to a client component, so the name crosses the boundary and the
 * lookup happens here.
 */
const ICONS = {
  panel: PanelIcon,
  learners: LearnersIcon,
  content: ContentIcon,
  organizations: OrganizationIcon,
  payments: PaymentIcon,
  settings: SettingsIcon,
} as const;

export type AdminNavItem = NavItem & {
  icon: keyof typeof ICONS;
  /** Route prefixes that should light this tab; the href alone is not enough. */
  match: string[];
};

/**
 * Console navigation, as a bottom bar to match the learner app.
 *
 * Fixed rather than in flow so it survives long content, and the console pages
 * reserve space for it so nothing hides underneath.
 */
export function AdminBottomNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  // Longest matching prefix wins, so /admin/content beats /admin.
  const activeHref = items
    .flatMap((item) => item.match.map((prefix) => ({ href: item.href, prefix })))
    .filter(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]?.href;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-2xl gap-1 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-[6px]">
        {items.map((item) => {
          const active = item.href === activeHref;
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-[6px] text-[10px] font-semibold leading-tight",
                active ? "bg-brand-soft text-brand-deep" : "text-muted",
              )}
            >
              <Icon size={20} />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
