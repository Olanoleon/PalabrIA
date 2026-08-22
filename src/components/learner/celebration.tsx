"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { t, type Lang } from "@/lib/i18n";
import { TrophyIcon, FlameIcon, BoardIcon } from "@/components/ui/icons";
import { confettiPieces } from "@/lib/confetti";
import { levelFromXp } from "@/lib/xp";

export type Celebration =
  | { kind: "first-xp"; xp: number }
  | { kind: "level-up"; level: number; totalXp: number };

/**
 * The moments that explain the gamification, over the result rather than
 * instead of it.
 *
 * These used to sit behind a flat `ink/70` scrim with the card centred, which
 * hid the score ring completely and read as a different screen. Now the ground
 * darkens towards the edges and the card arrives as a sheet from the bottom, so
 * the result the learner just earned stays in view behind the celebration.
 *
 * Shown one at a time: a learner who earns their first XP and levels up in the
 * same run gets the explanation first, then the celebration.
 */

/** Volleys across the upper half, where the scrim is clearest. */
const ORIGINS = [
  { x: 26, y: 24 },
  { x: 52, y: 15 },
  { x: 76, y: 27 },
  { x: 40, y: 34 },
];

export function Celebrations({
  queue,
  lang,
  onDone,
}: {
  queue: Celebration[];
  lang: Lang;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = queue[shown];

  const next = useCallback(() => {
    if (shown + 1 >= queue.length) onDone?.();
    setShown((n) => n + 1);
  }, [shown, queue.length, onDone]);

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, next]);

  useEffect(() => {
    buttonRef.current?.focus();
  }, [shown]);

  // Keyed to the position in the queue so the second celebration gets its own
  // volley rather than replaying the first one's.
  const pieces = useMemo(
    () =>
      current
        ? confettiPieces({
            seed: `${current.kind}:${shown}`,
            count: 60,
            origins: ORIGINS,
            spread: [90, 210],
            delay: [0, 620],
          })
        : [],
    [current, shown],
  );

  if (!current) return null;
  const d = t(lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={next}
      className="fixed inset-0 z-100 flex items-end justify-center px-6 pb-6 [animation:overlay-in_220ms_ease-out]"
      style={{
        // Mid-focus: clear over the score ring, closing to near-opaque at the
        // bezel so the eye is pulled inward instead of walled off.
        background:
          "radial-gradient(ellipse 78% 52% at 50% 36%, rgba(27,22,17,0.08) 0%, rgba(27,22,17,0.34) 58%, rgba(27,22,17,0.74) 100%)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((piece) => (
          <div key={piece.id} style={piece.style as React.CSSProperties} />
        ))}
      </div>

      <div
        className="relative w-full max-w-[340px] rounded-[26px] border-2 border-ink bg-paper p-6 text-center flat-3 [animation:panel-in_420ms_cubic-bezier(.2,.9,.3,1.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        {current.kind === "first-xp" ? (
          <FirstXp xp={current.xp} d={d} />
        ) : (
          <LevelUp level={current.level} totalXp={current.totalXp} d={d} />
        )}

        <button
          ref={buttonRef}
          type="button"
          onClick={next}
          className="press mt-5 w-full rounded-2xl border-2 border-ink bg-brand py-[13px] font-display text-[16px] font-bold text-brand-ink hard-2"
        >
          {current.kind === "first-xp" ? d.xpIntroCta : d.levelUpCta}
        </button>
      </div>
    </div>
  );
}

function FirstXp({ xp, d }: { xp: number; d: ReturnType<typeof t> }) {
  return (
    <>
      <div className="relative mx-auto grid size-[92px] place-items-center">
        <span className="absolute inset-0 rounded-full border-[3px] border-brand [animation:ring-pulse_1.4s_ease-out_260ms_2]" />
        <span className="grid size-[92px] place-items-center rounded-full border-2 border-ink bg-brand-soft font-display text-[24px] font-bold text-brand-deep [animation:count-in_760ms_cubic-bezier(.2,.9,.3,1.2)]">
          {d.xpIntroEarned(xp)}
        </span>
      </div>

      <h2 className="mt-4 font-display text-[23px] font-bold tracking-[-0.03em]">
        {d.xpIntroTitle}
      </h2>
      <p className="mt-2 text-[13.5px] leading-[1.5] text-body text-pretty">
        {d.xpIntroBody}
      </p>

      <ul className="mt-4 flex flex-col gap-2 text-left">
        <Point icon={<FlameIcon size={15} className="text-brand" />} text={d.xpIntroStreak} />
        <Point icon={<BoardIcon size={15} />} text={d.xpIntroBoard} />
      </ul>
    </>
  );
}

function LevelUp({
  level,
  totalXp,
  d,
}: {
  level: number;
  totalXp: number;
  d: ReturnType<typeof t>;
}) {
  const info = levelFromXp(totalXp);
  return (
    <>
      <div className="relative mx-auto grid size-[92px] place-items-center">
        <span className="absolute inset-0 rounded-full border-[3px] border-brand-mid [animation:ring-pulse_1.5s_ease-out_300ms_2]" />
        <span className="grid size-[92px] place-items-center rounded-full border-2 border-ink bg-brand text-brand-ink [animation:medal-in_720ms_cubic-bezier(.2,.9,.3,1.2)]">
          <TrophyIcon size={40} />
        </span>
      </div>

      <h2 className="mt-4 font-display text-[26px] font-bold tracking-[-0.03em]">
        {d.levelUpTitle(level)}
      </h2>
      <p className="mt-2 text-[13.5px] leading-[1.5] text-body text-pretty">
        {d.levelUpBody(totalXp)}
      </p>

      <div className="mt-4 rounded-2xl border-2 border-dashed border-ink bg-cream px-4 py-3">
        <div className="h-3 overflow-hidden rounded-full border-[1.5px] border-ink bg-surface p-[2px]">
          <div
            className="h-full rounded-full bg-[repeating-linear-gradient(115deg,#F97316_0_7px,#EA580C_7px_14px)] transition-[width] duration-700"
            style={{ width: `${Math.round(info.progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-[12px] font-semibold text-muted-2">
          {d.levelUpNext(info.xpToNext, info.level + 1)}
        </p>
      </div>
    </>
  );
}

function Point({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className={cn("flex items-start gap-[10px] text-[12.5px] leading-[1.45] text-body-2")}>
      <span className="mt-[1px] grid size-6 flex-none place-items-center rounded-lg border-2 border-ink bg-surface">
        {icon}
      </span>
      {text}
    </li>
  );
}
