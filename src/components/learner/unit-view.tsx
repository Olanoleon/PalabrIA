"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { t, type Lang } from "@/lib/i18n";
import { ChevronLeft } from "@/components/ui/icons";
import { IconButtonLink } from "@/components/ui/primitives";
import { CardsMode } from "@/components/learner/flip-card";
import { ReadingMode } from "@/components/learner/reading-mode";
import { Coachmark } from "@/components/learner/coachmark";
import { useToast } from "@/components/learner/toast";
import { completeOnboardingStep } from "@/lib/actions/onboarding";
import { needsStep } from "@/lib/onboarding";
import type { UnitDetail } from "@/lib/learner-data";

type Tab = "cards" | "read" | "video";

/**
 * Unit intro. Three tabs as designed, but the Avatar tab is disabled until an
 * AI avatar service is chosen (PRD), so the seen-counter runs to 2, not 3.
 *
 * On the very first unit a learner ever opens — and only then — Practice is
 * held shut until they have looked at the cards. The point is to teach the
 * intended order once, not to police it: every later unit is freely tappable,
 * including a retry of this one.
 */
export function UnitView({
  unit,
  lang,
  onboardingSteps,
}: {
  unit: UnitDetail;
  lang: Lang;
  onboardingSteps: string[];
}) {
  const d = t(lang);
  const { say } = useToast();
  const [tab, setTab] = useState<Tab>("cards");
  const [seen, setSeen] = useState<Record<Tab, boolean>>({
    cards: false,
    read: false,
    video: false,
  });

  // Captured once on mount: the gate must not spring open mid-screen when the
  // server action resolves and a re-render reports the step as done.
  const [gated] = useState(() => needsStep(onboardingSteps, "unit-practice"));
  const [hintCards] = useState(() => needsStep(onboardingSteps, "unit-cards"));

  const markSeen = (key: Tab) =>
    setSeen((prev) => {
      if (prev[key]) return prev;
      // Reaching the cards is what retires the gate, so record it server-side
      // the moment it happens rather than waiting for the learner to tap
      // Practice — they may well leave and come back instead.
      if (key === "cards" && gated) void completeOnboardingStep("unit-practice");
      return { ...prev, [key]: true };
    });
  const seenCount = [seen.cards, seen.read].filter(Boolean).length;
  const locked = gated && !seen.cards;

  const tabs: Array<{ key: Tab; label: string; disabled?: boolean }> = [
    { key: "cards", label: d.introTabs[0] },
    { key: "read", label: d.introTabs[1] },
    { key: "video", label: d.introTabs[2], disabled: true },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-3 px-[18px] pb-[10px] pt-4">
        <div className="flex items-center gap-3">
          <IconButtonLink href={`/area/${unit.areaId}`} aria-label={d.backArea}>
            <ChevronLeft />
          </IconButtonLink>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
              {d.unit} {unit.number} · {d.intro}
            </div>
            <div className="truncate font-display text-[18px] font-semibold tracking-[-0.02em]">
              {unit.name}
            </div>
          </div>
        </div>

        <div
          role="tablist"
          className="flex gap-[6px] rounded-[14px] border-2 border-ink bg-[#F1E7D8] p-1"
        >
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                role="tab"
                aria-selected={active}
                aria-disabled={item.disabled}
                type="button"
                onClick={() => {
                  if (item.disabled) {
                    say(d.videoSoon);
                    return;
                  }
                  setTab(item.key);
                  markSeen(item.key);
                }}
                className={cn(
                  "flex-1 rounded-[10px] border-2 py-2 text-center text-[12.5px] font-bold",
                  active
                    ? "border-ink bg-surface text-ink"
                    : "border-transparent bg-transparent",
                  item.disabled ? "text-muted-3" : !active && "text-muted",
                )}
              >
                {item.label}
                {item.disabled ? (
                  <span className="mt-[1px] block text-[9.5px] font-medium opacity-65">
                    {lang === "es" ? "pronto" : "soon"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-[18px] pb-3 pt-3">
        {tab === "cards" ? (
          <Coachmark
            step="unit-cards"
            active={hintCards}
            title={d.coachCardsTitle}
            body={d.coachCardsBody}
            cta={d.coachCta}
          >
            <CardsMode
              words={unit.words}
              lang={lang}
              hint={hintCards}
              onSeen={() => markSeen("cards")}
            />
          </Coachmark>
        ) : (
          <ReadingMode unit={unit} lang={lang} />
        )}
      </div>

      <div className="flex flex-col gap-[9px] border-t-2 border-rule px-[18px] pb-3 pt-[10px]">
        <div className="flex items-center gap-2 text-[11.5px] font-semibold text-muted">
          <span>
            {d.intro} {seenCount} / 2
          </span>
          <span className="ml-auto">{d.need70}</span>
        </div>
        {/*
          One line, on one unit, once — rather than a second overlay stacked on
          the card hint. A disabled primary button with no reason given reads as
          a bug.
        */}
        {locked ? (
          <p className="text-[11.5px] leading-[1.4] text-muted">
            {d.coachPracticeBody}
          </p>
        ) : null}
        {locked ? (
          <span
            aria-disabled="true"
            className="cursor-not-allowed rounded-2xl border-2 border-muted-line bg-locked py-[14px] text-center font-display text-[16.5px] font-bold text-muted-3"
          >
            {d.practice}
          </span>
        ) : (
          <Link
            href={`/practice/${unit.id}`}
            className="press rounded-2xl border-2 border-ink bg-brand py-[14px] text-center font-display text-[16.5px] font-bold text-white hard-2"
          >
            {d.practice}
          </Link>
        )}
      </div>
    </div>
  );
}
