import { Wordmark } from "@/components/ui/wordmark";
import { SignOutButton } from "@/components/learner/sign-out-button";
import { LangToggle } from "@/components/ui/lang-toggle";
import type { Lang } from "@/lib/i18n";
import {
  AdminBottomNav,
  type AdminNavItem,
} from "@/components/admin/admin-bottom-nav";
import { adminT } from "@/lib/i18n-admin";

export type NavItem = { href: string; label: string };

/**
 * Console chrome. Desktop-oriented but it collapses to a single column, since
 * an administrator may well be checking something from a phone.
 */
export function AdminShell({
  lang,
  title,
  subtitle,
  nav,
  banner,
  actions,
  children,
}: {
  lang: Lang;
  title: string;
  subtitle?: string;
  nav: AdminNavItem[];
  /** Accepted for call-site clarity; the bar derives its own active tab. */
  active?: string;
  banner?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      {/* pb-28 keeps the fixed bar from covering the end of the page. */}
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-28 pt-5 sm:px-6">
        <header className="flex flex-wrap items-center gap-3">
          <Wordmark />
          <span className="rounded-full border-[1.5px] border-ink bg-surface px-[10px] py-1 text-[11px] font-bold uppercase tracking-[0.08em]">
            {title}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <LangToggle lang={lang} />
            {/* Sized to its content: a fixed width clipped "Cerrar sesión". */}
            <SignOutButton lang={lang} className="px-4 py-[10px] text-[13px]" />
          </div>
        </header>

        {banner}

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}

        {subtitle ? (
          <p className="text-[13px] text-muted-2">{subtitle}</p>
        ) : null}

        <main className="flex flex-col gap-5">{children}</main>
      </div>

      <AdminBottomNav items={nav} />
    </div>
  );
}

/** Persistent warning that edits land on one organization, not the template. */
export function OrgModeBanner({
  orgName,
  onLeaveHref,
  lang,
}: {
  orgName: string;
  onLeaveHref: React.ReactNode;
  lang: Lang;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink bg-ink px-4 py-3 text-paper flat-2">
      <span className="rounded-full border-2 border-brand-mid bg-brand px-[10px] py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-ink">
        Organization Mode
      </span>
      <span className="font-display text-[16px] font-semibold tracking-[-0.01em]">
        {orgName}
      </span>
      <span className="text-[12px] text-[#B8AEA2]">{adminT(lang).orgModeNote}</span>
      <span className="ml-auto">{onLeaveHref}</span>
    </div>
  );
}

export function GlobalModeBanner({ lang }: { lang: Lang }) {
  const d = adminT(lang);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed border-ink bg-cream px-4 py-3">
      <span className="rounded-full border-[1.5px] border-ink bg-brand-soft px-[10px] py-1 text-[10.5px] font-bold uppercase tracking-[0.1em]">
        {d.globalModeTag}
      </span>
      <span className="text-[12.5px] text-body">{d.globalModeNote}</span>
    </div>
  );
}
