import Link from "next/link";
import { Avatar } from "@/components/ui/primitives";
import { ChevronRight } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";
import type { BoardRow } from "@/lib/learner-data";

/**
 * "Top learners this month" — the design's dark board panel, reduced to a
 * teaser that navigates to the leaderboard module instead of expanding.
 */
export function BoardTeaser({
  lang,
  rows,
  me,
  total,
  orgName,
}: {
  lang: Lang;
  rows: BoardRow[];
  me: BoardRow | null;
  total: number;
  orgName: string;
}) {
  const d = t(lang);
  const leader = rows[0];
  const gap = me && leader ? Math.max(0, leader.monthlyXp - me.monthlyXp) : 0;
  const subtitle = me
    ? `${d.boardRank(me.rank, total, orgName)} · ${gap > 0 ? d.boardGap(gap) : d.boardLeading}`
    : d.boardEmpty;

  return (
    <Link
      href="/leaderboard"
      className="press flex items-center gap-[11px] rounded-[20px] border-2 border-ink bg-ink px-[14px] py-3 text-paper shadow-[0_-6px_24px_rgba(27,22,17,0.18)]"
    >
      <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-brand font-display text-[14px] font-bold">
        {me ? me.rank : "–"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[14.5px] font-semibold tracking-[-0.01em]">
          {d.boardTop}
        </span>
        <span className="block truncate text-[11px] text-[#B8AEA2]">{subtitle}</span>
      </span>
      <span className="flex items-center">
        {rows.slice(0, 3).map((row) => (
          <Avatar
            key={row.learnerId}
            name={row.name}
            size={26}
            className="-ml-[7px]"
          />
        ))}
      </span>
      <ChevronRight size={14} className="flex-none text-paper" />
    </Link>
  );
}
