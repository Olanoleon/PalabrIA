"use client";

import { decidePayment } from "@/lib/actions/super";
import { Panel, Tag, Empty, TableScroll, Td, Th } from "@/components/admin/pieces";
import { ActionForm, Field } from "@/components/admin/form-bits";
import { formatDate, formatMoney, type Lang } from "@/lib/i18n";
import { adminT } from "@/lib/i18n-admin";

type Pending = {
  id: string;
  amount: number;
  currency: string;
  reference: string | null;
  declaredAt: Date;
  periodStart: Date;
  periodEnd: Date;
  learner: {
    id: string;
    billingStatus: string;
    user: { name: string; email: string };
    org: { id: string; name: string };
  };
};

type Decided = {
  id: string;
  amount: number;
  currency: string;
  reviewState: string;
  reviewedAt: Date | null;
  note: string | null;
  learner: { user: { name: string }; org: { name: string } };
};

/**
 * The Super Admin review queue. Declarations already granted access, so
 * confirming changes nothing and rejecting is what claws it back — which is why
 * a rejection demands a reason.
 */
export function PaymentsPanel({
  pending,
  decided,
  lang,
}: {
  pending: Pending[];
  decided: Decided[];
  lang: Lang;
}) {
  const d = adminT(lang);
  return (
    <>
      <Panel
        title={d.payQueueTitle}
        description={d.payQueueNote}
      >
        {pending.length === 0 ? (
          <Empty>{d.payQueueEmpty}</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border-2 border-ink bg-cream p-4"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <strong className="font-display text-[16px]">
                    {payment.learner.user.name}
                  </strong>
                  <span className="text-[12.5px] text-muted-2">
                    {payment.learner.user.email}
                  </span>
                  <Tag>{payment.learner.org.name}</Tag>
                  <span className="ml-auto font-display text-[18px] font-bold">
                    {formatMoney(payment.amount, payment.currency, lang)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted-2">
                  {d.payReported(formatDate(payment.declaredAt, lang))} ·{" "}
                  {d.payCovers(
                    formatDate(payment.periodStart, lang),
                    formatDate(payment.periodEnd, lang),
                  )}
                  {payment.reference ? (
                    <>
                      {" · ref "}
                      <span className="font-mono">{payment.reference}</span>
                    </>
                  ) : null}
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ActionForm
                    action={decidePayment}
                    submitLabel={d.payConfirm}
                    tone="primary"
                    hidden={{ paymentId: payment.id, decision: "CONFIRMED" }}
                  >
                    <Field label={d.payNoteOptional} name="note" />
                  </ActionForm>
                  <ActionForm
                    action={decidePayment}
                    submitLabel={d.payReject}
                    tone="danger"
                    hidden={{ paymentId: payment.id, decision: "REJECTED" }}
                  >
                    <Field label={d.reason} name="note" required />
                  </ActionForm>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={d.payDecisionsTitle}>
        {decided.length === 0 ? (
          <Empty>{d.payDecisionsEmpty}</Empty>
        ) : (
          <TableScroll>
            <thead>
              <tr>
                <Th>{d.colLearner}</Th>
                <Th>{d.colOrganization}</Th>
                <Th>{d.colAmount}</Th>
                <Th>{d.colDecision}</Th>
                <Th>{d.colNote}</Th>
              </tr>
            </thead>
            <tbody>
              {decided.map((payment) => (
                <tr key={payment.id}>
                  <Td>{payment.learner.user.name}</Td>
                  <Td>{payment.learner.org.name}</Td>
                  <Td>{formatMoney(payment.amount, payment.currency, lang)}</Td>
                  <Td>
                    <Tag tone={payment.reviewState === "CONFIRMED" ? "pass" : "neutral"}>
                      {payment.reviewState === "CONFIRMED" ? d.payConfirmed : d.payRejected}
                    </Tag>
                    {payment.reviewedAt ? (
                      <div className="mt-1 text-[11px] text-muted-2">
                        {formatDate(payment.reviewedAt, lang)}
                      </div>
                    ) : null}
                  </Td>
                  <Td className="text-[12px] text-muted-2">{payment.note ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        )}
      </Panel>
    </>
  );
}
