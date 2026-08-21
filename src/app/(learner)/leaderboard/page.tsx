import { learnerContext, monthlyBoard } from "@/lib/learner-data";
import { Avatar } from "@/components/ui/primitives";
import { monthLabel } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/**
 * The leaderboard module. This replaces the design's Review tab, which only
 * fired a toast; the design's dark board panel becomes the whole screen.
 */
export default async function LeaderboardPage() {
  // Gated like the learning screens: only payments and profile stay open to a
  // suspended learner.
  const { user, learner, lang, d } = await learnerContext({ requireAccess: true });
  const board = await monthlyBoard(learner.orgId, learner.id);
  const month = monthLabel(new Date(), lang);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-2 border-b-2 border-ink bg-brand-soft px-[18px] pb-4 pt-4">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
          {user.org?.name}
        </div>
        <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em]">
          {d.boardTitle(month)}
        </h1>
        {board.me ? (
          <p className="text-[12.5px] font-medium text-body">
            {d.boardRank(board.me.rank, board.total, user.org?.name ?? "")}
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-[14px] pb-6 pt-[14px]">
        <div className="overflow-hidden rounded-[20px] border-2 border-ink bg-ink text-paper">
          <div className="flex items-center gap-2 px-4 pb-2 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            <span className="w-6">#</span>
            <span className="flex-1">{d.colPeer}</span>
            <span>XP</span>
          </div>

          <div className="flex flex-col gap-1 px-[10px] pb-3">
            {board.rows.length === 0 ? (
              <p className="px-2 py-4 text-[12.5px] text-[#B8AEA2]">{d.boardEmpty}</p>
            ) : (
              board.rows.map((row) => (
                <div
                  key={row.learnerId}
                  className={cn(
                    "flex items-center gap-[9px] rounded-xl px-2 py-2",
                    row.isMe
                      ? "bg-brand"
                      : row.rank <= 3
                        ? "bg-[rgba(253,249,243,0.09)]"
                        : "bg-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "w-6 font-display text-[14px] font-bold",
                      row.isMe
                        ? "text-white"
                        : row.rank <= 3
                          ? "text-brand-mid"
                          : "text-muted",
                    )}
                  >
                    {row.rank}
                    {d.ordinal}
                  </span>
                  <Avatar name={row.name} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">
                      {row.name}
                      {row.isMe ? d.meSuffix : ""}
                    </span>
                    <span
                      className={cn(
                        "block text-[10.5px]",
                        row.isMe ? "text-white/78" : "text-muted",
                      )}
                    >
                      {row.team ?? ""}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-[14px] font-bold">
                      {row.monthlyXp}
                    </span>
                    <span
                      className={cn(
                        "block text-[10px]",
                        row.isMe ? "text-white/78" : "text-muted",
                      )}
                    >
                      {row.words} {d.words}
                    </span>
                  </span>
                </div>
              ))
            )}
            <p className="px-2 pb-1 pt-2 text-[11px] leading-[1.45] text-[#B8AEA2]">
              {d.boardNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
