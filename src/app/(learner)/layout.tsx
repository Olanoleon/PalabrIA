import { requireLearner } from "@/lib/rbac";
import { currentLang } from "@/lib/lang";
import { BottomNav } from "@/components/learner/bottom-nav";
import { ToastProvider } from "@/components/learner/toast";

/**
 * The learner shell: a phone-width column with the tab bar pinned underneath.
 * Payment gating is not done here — it is per screen, so the payments and
 * profile screens stay reachable while a learner is suspended.
 */
export default async function LearnerLayout({ children }: LayoutProps<"/">) {
  await requireLearner();
  const lang = await currentLang();

  return (
    <ToastProvider>
      {/*
        h-dvh, not min-h-dvh: with a minimum the column grows past the viewport
        and the page itself scrolls, which pushed the leaderboard below the fold
        once an organization had more than a couple of areas. Fixing the height
        makes each screen's own list the thing that scrolls.
      */}
      <div className="screen-shell flex h-dvh flex-col overflow-hidden bg-paper text-ink">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <BottomNav lang={lang} />
      </div>
    </ToastProvider>
  );
}
