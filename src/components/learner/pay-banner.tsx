import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

/**
 * Nudge shown on the learning screens when a payment is close or overdue. It
 * never appears for a learner an administrator has cleared.
 */
export function PayBanner({
  lang,
  daysUntilDue,
}: {
  lang: Lang;
  daysUntilDue: number;
}) {
  const d = t(lang);
  const overdue = daysUntilDue <= 0;
  return (
    <Link
      href="/payments"
      className="press flex items-center gap-3 rounded-2xl border-2 border-ink px-[13px] py-[11px] text-[12.5px] font-semibold hard-1"
      style={{ background: overdue ? "#FFF9EF" : "#FFEDD5" }}
    >
      <span className="flex-1">{d.payBanner(daysUntilDue)}</span>
      <span className="rounded-full border-[1.5px] border-ink bg-brand px-[10px] py-1 text-[11px] font-bold text-brand-ink">
        {d.payBannerCta}
      </span>
    </Link>
  );
}
