import Link from "next/link";
import {
  badgeState,
  learnerContext,
  weekActivity,
  wordsLearned,
} from "@/lib/learner-data";
import { Avatar, NoteCard } from "@/components/ui/primitives";
import { ChevronRight, PaymentIcon, TrophyIcon } from "@/components/ui/icons";
import { SignOutButton } from "@/components/learner/sign-out-button";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/i18n";

export default async function ProfilePage() {
  const { user, learner, lang, d, level, settings, billing } = await learnerContext();
  const [badges, week, words] = await Promise.all([
    badgeState(learner.id),
    weekActivity(learner.id, learner.timezone),
    wordsLearned(learner.id),
  ]);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-[18px] pb-1 pt-4">
        <div className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-muted">
          {d.profile}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-[18px] pb-6 pt-[14px]">
        <div className="flex items-center gap-[14px]">
          <Avatar name={user.name} size={62} className="flat-1" />
          <div>
            <h1 className="font-display text-[21px] font-semibold tracking-[-0.02em]">
              {user.name}
            </h1>
            <p className="text-[12px] text-muted-2">
              {d.profileMeta(level.level, learner.xp, learner.streakCount)}
            </p>
            <p className="text-[11.5px] text-muted">
              {words} {d.words}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[18px] border-2 border-ink bg-surface p-[15px] flat-2">
          <div className="font-display text-[13.5px] font-semibold uppercase tracking-[0.04em]">
            {d.streakTitle(learner.streakCount)}
          </div>
          <div className="flex justify-between">
            {week.map((day, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-[6px] text-[10.5px] font-semibold text-muted"
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-[10px] border-2 text-[12px] font-bold",
                    day.active
                      ? "border-ink bg-brand text-white"
                      : day.isToday
                        ? "border-ink bg-brand-soft text-muted"
                        : "border-muted-line bg-locked text-muted",
                  )}
                >
                  {day.active ? "✓" : day.isToday ? "·" : ""}
                </span>
                {d.week[index]}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[9px]">
          <div className="font-display text-[13.5px] font-semibold uppercase tracking-[0.04em]">
            {d.badgesTitle}
          </div>
          <Link
            href="/badges"
            className="press flex items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-[14px] flat-2"
          >
            <span className="grid size-[38px] flex-none place-items-center rounded-xl border-2 border-ink bg-brand-soft">
              <TrophyIcon size={21} />
            </span>
            <span className="flex-1">
              <span className="block text-[14.5px] font-bold">{d.seeBadges}</span>
              <span className="block text-[11.5px] text-muted-2">
                {earned}/{badges.length} {d.earnedWord}
              </span>
            </span>
            <ChevronRight size={15} />
          </Link>

          <Link
            href="/payments"
            className="press flex items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-[14px] flat-2"
          >
            <span className="grid size-[38px] flex-none place-items-center rounded-xl border-2 border-ink bg-brand-soft">
              <PaymentIcon size={21} />
            </span>
            <span className="flex-1">
              <span className="block text-[14.5px] font-bold">{d.paymentsTitle}</span>
              <span className="block text-[11.5px] text-muted-2">
                {formatMoney(settings.monthlyAmount, settings.currency, lang)} ·{" "}
                {billing.status === "ACTIVE"
                  ? d.payStatusActive
                  : billing.status === "OVERRIDE_ACTIVE"
                    ? d.payStatusOverride
                    : billing.status === "SUSPENDED"
                      ? d.payStatusSuspended
                      : billing.status === "PAST_DUE"
                        ? d.payStatusPastDue(billing.daysOverdue ?? 0)
                        : d.payStatusTrial}
              </span>
            </span>
            <ChevronRight size={15} />
          </Link>
        </div>

        <NoteCard>{d.xpNote}</NoteCard>
        <SignOutButton lang={lang} />
      </div>
    </div>
  );
}
