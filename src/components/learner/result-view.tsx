"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { t, type Lang } from "@/lib/i18n";
import { ProgressRing } from "@/components/ui/primitives";
import type { ResultSummary } from "@/lib/progress";

const CONFETTI_COLORS = ["#EA580C", "#15803D", "#F59E0B", "#FFFFFF", "#C2410C"];

/**
 * 26 pieces bursting outward. Generated once per result so a re-render does not
 * restart the animation mid-flight.
 */
function useConfetti(enabled: boolean, seed: string) {
  return useMemo(() => {
    if (!enabled) return [];
    // Deterministic from the seed so server and client agree and the burst does
    // not reshuffle on hydration.
    let state = 0;
    for (const ch of seed) state = (state * 31 + ch.charCodeAt(0)) % 100_000;
    const rand = (min: number, max: number) => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return min + (state / 2147483648) * (max - min);
    };
    return Array.from({ length: 26 }, (_, i) => {
      const angle = (i / 26) * Math.PI * 2 + rand(-0.16, 0.16);
      const distance = rand(70, 145);
      const round = i % 3 === 0;
      const width = round ? rand(7, 10) : rand(6, 11);
      return {
        id: i,
        style: {
          position: "absolute" as const,
          left: "50%",
          top: "50%",
          width: `${width}px`,
          height: `${round ? width : rand(9, 15)}px`,
          marginLeft: `${-width / 2}px`,
          marginTop: "-6px",
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          border: "1.5px solid #1B1611",
          borderRadius: round ? "50%" : "2px",
          pointerEvents: "none" as const,
          opacity: 0,
          "--tx": `${Math.cos(angle) * distance * 0.95}px`,
          "--ty": `${Math.sin(angle) * distance * 0.62 + rand(30, 80)}px`,
          "--rot": `${rand(-540, 540)}deg`,
          animation: `burst ${rand(1000, 1650).toFixed(0)}ms cubic-bezier(.15,.75,.35,1) ${rand(0, 220).toFixed(0)}ms forwards`,
        } as React.CSSProperties,
      };
    });
  }, [enabled, seed]);
}

export function ResultView({
  result,
  lang,
  areaId,
  unitId,
  unitName,
  onRetry,
}: {
  result: ResultSummary;
  lang: Lang;
  areaId: string;
  unitId: string;
  unitName: string;
  onRetry: () => void;
}) {
  const d = t(lang);
  const router = useRouter();
  const pass = result.passed;
  const confetti = useConfetti(pass, `${unitId}:${result.score}:${result.attempt}`);

  // The last unit of an area has nothing to unlock, so a failing run there
  // reports the area as unfinished rather than naming a nonexistent next unit.
  const panelTitle = pass
    ? result.nextUnit
      ? d.unlockedX(result.nextUnit.name)
      : d.areaComplete
    : result.nextUnit
      ? d.stillLocked(result.nextUnit.name)
      : d.areaNotDone;

  const panelNote = pass
    ? result.nextUnit
      ? `${d.unit} ${result.nextUnit.sortOrder + 1}`
      : d.allDone(unitName)
    : result.nextUnit
      ? d.lockNote
      : d.areaNotDoneNote;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[18px] pb-[14px] pt-5">
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-auto px-[5px] pb-[5px] text-center">
        <ProgressRing
          size={172}
          stroke={13}
          progress={result.score / 100}
          color={pass ? "#15803D" : "#EA580C"}
          className="animate-pop"
        >
          <div className="flex flex-col items-center">
            <span className="font-display text-[46px] font-bold tracking-[-0.04em]">
              {result.score}%
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
              {d.accuracy}
            </span>
          </div>
        </ProgressRing>

        <div>
          <h1 className="font-display text-[26px] font-bold tracking-[-0.03em]">
            {pass ? d.passTitle : d.failTitle}
          </h1>
          <p className="mx-auto mt-[7px] max-w-[300px] text-[13.5px] leading-[1.5] text-body text-pretty">
            {pass ? d.passNote(result.xpAwarded) : d.failNote}
          </p>
        </div>

        <div className="flex w-full gap-[9px]">
          {[
            { value: `${result.correct}/${result.total}`, label: d.hits },
            { value: `+${result.xpAwarded}`, label: "XP" },
            { value: `${result.attempt}${d.ordinal}`, label: d.attempt },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 rounded-[14px] border-2 border-ink bg-surface px-2 py-3 flat-1"
            >
              <div className="font-display text-[19px] font-bold">{stat.value}</div>
              <div className="mt-[1px] text-[10.5px] font-semibold text-muted">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="relative w-full">
          {confetti.map((piece) => (
            <div key={piece.id} style={piece.style} />
          ))}
          <div
            className={cn(
              "flex w-full items-center gap-3 overflow-hidden rounded-[18px] border-2 border-ink p-[15px] text-left",
              pass ? "bg-pass-soft flat-2" : "border-dashed bg-locked shadow-none",
            )}
          >
            <span
              className={cn(
                "grid size-10 flex-none place-items-center rounded-xl border-2 border-ink text-[17px]",
                pass ? "bg-pass" : "bg-canvas",
              )}
            >
              {pass ? "✓" : "🔒"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-bold [overflow-wrap:anywhere]">
                {panelTitle}
              </span>
              <span className="mt-[2px] block text-[12px] leading-[1.4] text-body [overflow-wrap:anywhere]">
                {panelNote}
              </span>
            </span>
          </div>
        </div>

        {result.leveledUpTo ? (
          <div className="w-full rounded-2xl border-2 border-ink bg-brand-soft px-4 py-3 text-[13.5px] font-bold">
            {d.levelUp(result.leveledUpTo)}
          </div>
        ) : null}

        {result.newBadges.length ? (
          <div className="w-full rounded-2xl border-2 border-dashed border-ink bg-cream px-4 py-3 text-[13px] font-semibold">
            {d.newBadge(result.newBadges.length)}
          </div>
        ) : null}

        {!pass && result.missedWords.length ? (
          <div className="flex w-full flex-col gap-2 text-left">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
              {d.reviewFirst}
            </div>
            {result.missedWords.map((word) => (
              <div
                key={word}
                className="rounded-[14px] border-2 border-ink bg-cream px-[14px] py-3 text-[15px] font-bold"
              >
                {word}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-[9px] pt-[14px]">
        <button
          type="button"
          onClick={() => {
            if (pass) {
              router.push(
                result.nextUnit ? `/unit/${result.nextUnit.id}` : `/area/${areaId}`,
              );
            } else {
              router.push(`/unit/${unitId}`);
            }
          }}
          className="press rounded-2xl border-2 border-ink bg-brand py-[14px] text-center font-display text-[16.5px] font-bold text-white hard-2"
        >
          {pass
            ? result.nextUnit
              ? d.goUnit(result.nextUnit.sortOrder + 1)
              : d.backArea
            : d.reviewCards}
        </button>
        <button
          type="button"
          onClick={() => {
            if (pass) router.push(result.nextUnit ? `/area/${areaId}` : "/path");
            else onRetry();
          }}
          className="press rounded-2xl border-2 border-ink bg-surface py-3 text-center text-[14px] font-bold"
        >
          {pass ? (result.nextUnit ? d.backArea : d.backPath) : d.retry}
        </button>
      </div>
    </div>
  );
}
