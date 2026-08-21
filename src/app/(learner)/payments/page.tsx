import Image from "next/image";
import { learnerContext, paymentsData } from "@/lib/learner-data";
import { isUsableKey, qrDataUrl } from "@/lib/breb";
import { formatDate, formatMoney } from "@/lib/i18n";
import { NoteCard } from "@/components/ui/primitives";
import { DeclarePayment } from "@/components/learner/declare-payment";
import { CopyKey } from "@/components/learner/copy-key";
import { cn } from "@/lib/cn";

const STATE_TONE = {
  PENDING: "border-ink bg-brand-soft text-brand-dark",
  CONFIRMED: "border-pass bg-pass-soft text-pass-deep",
  REJECTED: "border-muted-3 bg-locked text-muted",
} as const;

export default async function PaymentsPage() {
  const { lang, d, learner } = await learnerContext();
  const { settings, payments, billing } = await paymentsData(learner.id);

  const keyUsable = isUsableKey(settings.brebKey);
  const qr = keyUsable ? await qrDataUrl(settings.brebKey) : null;

  const statusLine =
    billing.status === "OVERRIDE_ACTIVE"
      ? d.payStatusOverride
      : billing.status === "DISABLED"
        ? d.payStatusDisabled
        : billing.status === "SUSPENDED"
          ? d.payStatusSuspended
          : billing.status === "PAST_DUE"
            ? d.payStatusPastDue(billing.daysOverdue ?? 0)
            : billing.status === "TRIAL"
              ? d.payStatusTrial
              : billing.daysUntilDue !== null && billing.daysUntilDue <= 5
                ? d.payStatusDueSoon(billing.daysUntilDue)
                : d.payStatusActive;

  const tone =
    billing.status === "SUSPENDED" || billing.status === "DISABLED"
      ? "bg-cream"
      : billing.status === "PAST_DUE"
        ? "bg-brand-soft"
        : "bg-pass-soft";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-1 px-[18px] pb-2 pt-4">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
          {d.payments}
        </div>
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.03em]">
          {d.paymentsTitle}
        </h1>
        <p className="text-[12.5px] text-body">{d.paymentsSub}</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-[18px] pb-6 pt-2">
        <div className={cn("rounded-[18px] border-2 border-ink p-[15px] flat-2", tone)}>
          <div className="text-[14.5px] font-bold">{statusLine}</div>
          {billing.paidThrough ? (
            <div className="mt-[3px] text-[12px] text-body">
              {d.payPaidThrough(formatDate(billing.paidThrough, lang))}
            </div>
          ) : null}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
              {d.payAmount}
            </span>
            <span className="font-display text-[20px] font-bold">
              {formatMoney(settings.monthlyAmount, settings.currency, lang)}
            </span>
          </div>
        </div>

        {!billing.access ? <NoteCard tone="cream">{d.paySuspendedBody}</NoteCard> : null}

        {keyUsable && qr ? (
          <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-ink bg-surface p-[15px] flat-2">
            <Image
              src={qr}
              alt={d.payQrHint}
              width={220}
              height={220}
              unoptimized
              className="rounded-xl border-2 border-ink"
            />
            <p className="text-[11.5px] font-semibold text-muted">{d.payQrHint}</p>
            <CopyKey value={settings.brebKey} lang={lang} />
          </div>
        ) : (
          <NoteCard tone="cream">{d.payNoKey}</NoteCard>
        )}

        {billing.status === "DISABLED" ? null : <DeclarePayment lang={lang} />}

        <div className="flex flex-col gap-2">
          <div className="font-display text-[13.5px] font-semibold uppercase tracking-[0.04em]">
            {d.payHistory}
          </div>
          {payments.length === 0 ? (
            <p className="text-[12.5px] text-muted-2">{d.payHistoryEmpty}</p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-surface px-[14px] py-3 flat-1"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold">
                    {formatMoney(payment.amount, payment.currency, lang)}
                  </span>
                  <span className="block text-[11px] text-muted-2">
                    {d.payPeriod(
                      formatDate(payment.periodStart, lang),
                      formatDate(payment.periodEnd, lang),
                    )}
                  </span>
                  {payment.reference ? (
                    <span className="block font-mono text-[10.5px] text-muted">
                      {payment.reference}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "flex-none rounded-full border-[1.5px] px-[10px] py-1 text-[10.5px] font-bold",
                    STATE_TONE[payment.reviewState],
                  )}
                >
                  {payment.reviewState === "PENDING"
                    ? d.payPending
                    : payment.reviewState === "CONFIRMED"
                      ? d.payConfirmed
                      : d.payRejected}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
