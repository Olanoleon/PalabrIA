import Link from "next/link";
import { LangToggle } from "@/components/ui/lang-toggle";
import { Wordmark } from "@/components/ui/wordmark";
import { FlameIcon, TrophyIcon } from "@/components/ui/icons";
import type { Lang } from "@/lib/i18n";

/** Logo, streak, XP and the language pill — the design's top row. */
export function LearnerHeader({
  lang,
  streak,
  xp,
}: {
  lang: Lang;
  streak: number;
  xp: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Wordmark className="mr-auto" />
      <span className="inline-flex items-center gap-[5px] rounded-full border-[1.5px] border-ink bg-brand-soft px-[10px] py-[5px] text-[12px] font-semibold">
        <FlameIcon className="text-brand" />
        {streak}
      </span>
      <span className="rounded-full border-[1.5px] border-ink bg-surface px-[10px] py-[5px] text-[12px] font-semibold">
        {xp} XP
      </span>
      <LangToggle lang={lang} />
    </div>
  );
}

/** Level bar plus the badge-count pill that links to the badge wall. */
export function LevelBar({
  progress,
  badgeCount,
  badgeTotal,
}: {
  progress: number;
  badgeCount: number;
  badgeTotal: number;
}) {
  return (
    <div className="flex items-center gap-[10px]">
      <div className="h-3 flex-1 overflow-hidden rounded-full border-[1.5px] border-ink bg-surface p-[2px]">
        <div
          className="h-full rounded-full bg-[repeating-linear-gradient(115deg,#F97316_0_7px,#EA580C_7px_14px)] transition-[width] duration-500"
          style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }}
        />
      </div>
      <Link
        href="/badges"
        className="press flex flex-none items-center gap-[6px] rounded-full border-2 border-ink bg-brand-soft px-[10px] py-[6px] text-[11.5px] font-bold text-ink hard-1"
      >
        <TrophyIcon size={17} />
        {badgeCount}/{badgeTotal}
      </Link>
    </div>
  );
}
