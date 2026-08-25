import {
  badgeState,
  areaSections,
  learnerContext,
  monthlyBoard,
  visibleAreas,
} from "@/lib/learner-data";
import { LearnerHeader, LevelBar } from "@/components/learner/header-chips";
import { AreaCard } from "@/components/learner/area-card";
import { Coachmark } from "@/components/learner/coachmark";
import { needsStep } from "@/lib/onboarding";
import { BoardTeaser } from "@/components/learner/board-teaser";
import { PayBanner } from "@/components/learner/pay-banner";
import { NoteCard } from "@/components/ui/primitives";

export default async function PathPage() {
  const { user, learner, lang, d, level, billing } = await learnerContext({
    requireAccess: true,
  });

  const [areas, board, badges] = await Promise.all([
    visibleAreas(learner.orgId, learner.id),
    monthlyBoard(learner.orgId, learner.id),
    badgeState(learner.id),
  ]);

  const earned = badges.filter((b) => b.earned).length;
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-[14px] px-[18px] pb-3 pt-4">
        <LearnerHeader lang={lang} streak={learner.streakCount} xp={learner.xp} />

        <div className="flex items-end gap-[10px]">
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">
              {d.thisWeek}
            </div>
            <h1 className="mt-[3px] font-display text-[27px] font-semibold tracking-[-0.03em]">
              {d.greet(firstName)}
            </h1>
          </div>
          <div className="ml-auto text-right">
            <div className="font-display text-[19px] font-bold text-brand-deep">
              {d.level(level.level)}
            </div>
            <div className="text-[11px] text-muted">
              {d.xpNext(level.xpToNext, level.level + 1)}
            </div>
          </div>
        </div>

        <LevelBar
          progress={level.progress}
          badgeCount={earned}
          badgeTotal={badges.length}
        />

        {billing.showBanner ? (
          <PayBanner
            lang={lang}
            daysUntilDue={billing.daysUntilDue ?? -(billing.daysOverdue ?? 0)}
          />
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-[18px] pb-4 pt-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-[14px] font-semibold uppercase tracking-[0.02em]">
            {d.areasTitle}
          </h2>
          <span className="text-[11.5px] text-muted">{d.areasSub(areas.length)}</span>
        </div>

        {areas.length === 0 ? (
          <NoteCard>{d.areasEmpty}</NoteCard>
        ) : (
          areaSections(areas).map((section) => (
            <div key={section.heading ?? "untagged"} className="flex flex-col gap-3">
              {/*
                A section with no heading is the untagged one, which every
                area created before tags existed belongs to. It leads, and
                looks exactly as the list always did.
              */}
              {section.heading ? (
                <div className="mt-1 flex items-center gap-[10px]">
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-brand-deep">
                    {section.heading}
                  </span>
                  <span className="h-[2px] flex-1 rounded-full bg-rule" />
                </div>
              ) : null}

              {section.areas.map((area) => {
                const index = areas.indexOf(area);
                // Only the first card on the screen is spotlit: dimming the
                // page around every card would say nothing about where to begin.
                return index === 0 ? (
                  <Coachmark
                    key={area.id}
                    step="path-tap"
                    active={needsStep(learner.onboardingSteps, "path-tap")}
                    title={d.coachPathTitle}
                    body={d.tapHint}
                    cta={d.coachCta}
                  >
                    <AreaCard area={area} lang={lang} index={index} />
                  </Coachmark>
                ) : (
                  <AreaCard key={area.id} area={area} lang={lang} index={index} />
                );
              })}
            </div>
          ))
        )}
      </div>

      {/*
        Outside the scrolling list so it is always reachable, and inset from the
        area cards so its narrower width reads as a different kind of thing.
      */}
      <div className="relative z-40 shrink-0 px-8 pb-2 pt-1">
        <BoardTeaser
          lang={lang}
          rows={board.rows}
          me={board.me}
          total={board.total}
          orgName={user.org?.name ?? ""}
        />
      </div>
    </div>
  );
}
