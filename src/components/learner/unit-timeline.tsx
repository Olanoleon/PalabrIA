"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { t, type Lang } from "@/lib/i18n";
import { ChevronRight } from "@/components/ui/icons";
import { useToast } from "@/components/learner/toast";
import type { UnitRowData } from "@/lib/learner-data";

/**
 * The unit path: a dot column with a connector line beside cards that state
 * their own progress. Locked cards go dashed and lose their shadow; the current
 * one nudges to draw the eye, exactly as in the design.
 */
export function UnitTimeline({
  units,
  lang,
  blockingNumber,
}: {
  units: UnitRowData[];
  lang: Lang;
  blockingNumber: number;
}) {
  const d = t(lang);
  const router = useRouter();
  const { say } = useToast();

  return (
    <div>
      {units.map((unit, index) => {
        const passed = unit.state === "passed";
        const current = unit.state === "current";
        const locked = unit.state === "locked";
        const isLast = index === units.length - 1;

        return (
          <div key={unit.id} className="flex gap-3">
            <div className="flex w-[30px] flex-none flex-col items-center pt-4">
              <div
                className={cn(
                  "grid size-[30px] flex-none place-items-center rounded-full border-2 border-ink text-[12px] font-bold",
                  passed && "bg-pass text-white",
                  current && "bg-brand text-white",
                  locked && "bg-canvas text-muted",
                )}
              >
                {passed ? "✓" : unit.number}
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    "min-h-4 w-[3px] flex-1 rounded-full",
                    passed ? "bg-pass" : "bg-rule",
                  )}
                />
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                if (locked) {
                  say(d.lockedUnit(blockingNumber));
                  return;
                }
                router.push(`/unit/${unit.id}`);
              }}
              className={cn(
                "mb-3 flex flex-1 flex-col gap-[7px] rounded-[18px] border-2 border-ink p-[15px] text-left",
                locked
                  ? "cursor-default border-dashed bg-locked shadow-none"
                  : current
                    ? "press bg-surface flat-3 animate-nudge"
                    : "press bg-surface flat-1",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10.5px] font-bold uppercase tracking-[0.1em]",
                    locked ? "text-muted-3" : "text-brand-deep",
                  )}
                >
                  {d.unit} {unit.number}
                </span>
                {unit.updated ? (
                  <span className="rounded-full border-[1.5px] border-brand bg-brand-soft px-[9px] py-[3px] text-[11px] font-bold text-brand-dark">
                    {d.tagUpdated}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "ml-auto rounded-full border-[1.5px] px-[9px] py-[3px] text-[11px] font-bold",
                    passed && "border-pass bg-pass-soft text-pass-deep",
                    current && "border-brand bg-brand-soft text-brand-dark",
                    locked && "border-muted-line bg-transparent text-muted",
                  )}
                >
                  {passed ? `${unit.score}%` : current ? d.tagCurrent : d.tagLocked}
                </span>
              </div>

              <span
                className={cn(
                  "font-display text-[19px] font-semibold leading-[1.15] tracking-[-0.02em]",
                  locked ? "text-muted" : "text-ink",
                )}
              >
                {unit.name}
              </span>

              <span className={cn("text-[12px]", locked ? "text-muted-3" : "text-muted-2")}>
                {locked
                  ? d.lockedSub
                  : lang === "en"
                    ? unit.subtitleEn
                    : unit.subtitle}
              </span>

              {unit.updated ? (
                <span className="mt-1 flex items-center gap-[7px] text-[12px] font-semibold text-brand-deep">
                  {d.updatedUnitNote}
                  <ChevronRight size={11} />
                </span>
              ) : null}

              {current ? (
                <span className="mt-1 flex items-center gap-[7px] text-[12.5px] font-bold text-brand-deep">
                  {unit.score > 0 ? d.ctaReview : d.ctaStart}
                  <ChevronRight size={12} />
                </span>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}
