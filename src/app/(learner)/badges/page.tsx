import { badgeState, learnerContext } from "@/lib/learner-data";
import { IconButtonLink } from "@/components/ui/primitives";
import { ChevronLeft } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Translated } from "@/lib/i18n";

export default async function BadgesPage() {
  const { learner, d } = await learnerContext();
  const badges = await badgeState(learner.id);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-3 border-b-2 border-ink bg-brand-soft px-[18px] pb-3 pt-4">
        <div className="flex items-center gap-3">
          <IconButtonLink href="/profile" aria-label={d.profile}>
            <ChevronLeft />
          </IconButtonLink>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
            {earned}/{badges.length} {d.earnedWord}
          </span>
        </div>
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em]">
            {d.badgesView}
          </h1>
          <p className="mt-1 text-[12.5px] font-medium text-body">{d.badgesSub}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-[18px] pb-7 pt-[14px]">
        <div className="grid grid-cols-2 gap-[10px]">
          {badges.map((badge) => {
            const title = d[badge.key as keyof Translated] as string;
            const meta = d[`${badge.key}m` as keyof Translated] as string;
            return (
              <div
                key={badge.key}
                className={cn(
                  "flex flex-col gap-2 rounded-[18px] border-2 border-ink p-[14px]",
                  badge.earned
                    ? "bg-surface flat-2"
                    : "border-dashed bg-locked shadow-none",
                )}
              >
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-xl border-2",
                    badge.earned
                      ? "border-ink bg-brand-soft text-ink"
                      : "border-muted-line bg-canvas text-muted-3",
                  )}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={badge.svgPath} />
                  </svg>
                </span>
                <span
                  className={cn(
                    "text-[14px] font-bold",
                    badge.earned ? "text-ink" : "text-muted",
                  )}
                >
                  {title}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-[1.4]",
                    badge.earned ? "text-muted-2" : "text-muted-3",
                  )}
                >
                  {meta}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.08em]",
                    badge.earned ? "text-brand-deep" : "text-muted-3",
                  )}
                >
                  {badge.earned ? d.earnedTag : d.locked}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
