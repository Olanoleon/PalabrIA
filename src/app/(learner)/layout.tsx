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
      <div className="screen-shell flex min-h-dvh flex-col bg-paper text-ink">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <BottomNav lang={lang} />
      </div>
    </ToastProvider>
  );
}
