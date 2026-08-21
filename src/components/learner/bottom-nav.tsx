"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { t, type Lang } from "@/lib/i18n";
import {
  BoardIcon,
  PathIcon,
  PaymentIcon,
  ProfileIcon,
} from "@/components/ui/icons";

/**
 * Four tabs. The design ships three (Path / Review / Profile); Review became
 * the leaderboard module and Payments was added, per the PRD's nav list.
 */
const TABS = [
  { href: "/path", Icon: PathIcon },
  { href: "/leaderboard", Icon: BoardIcon },
  { href: "/payments", Icon: PaymentIcon },
  { href: "/profile", Icon: ProfileIcon },
] as const;

/**
 * The design shows the tab bar on the home screen only — every deeper screen
 * gets a back button instead, and the practice flow is deliberately
 * distraction-free. These are the screens a tab actually lands on.
 */
const TAB_ROOTS = new Set<string>(TABS.map((tab) => tab.href));

export function BottomNav({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const labels = t(lang).tabs;

  if (!TAB_ROOTS.has(pathname)) return null;

  return (
    <nav className="relative z-45 flex gap-[6px] border-t-[1.5px] border-rule bg-paper px-[14px] pb-3 pt-[6px]">
      {TABS.map((tab, index) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl py-[6px] text-[10.5px] font-semibold",
              active ? "text-brand" : "text-muted",
            )}
          >
            <tab.Icon />
            {labels[index]}
          </Link>
        );
      })}
    </nav>
  );
}
