"use client";

import { decidePayment } from "@/lib/actions/super";
import { Panel, Tag, Empty, TableScroll, Td, Th } from "@/components/admin/pieces";
import { ActionForm, Field } from "@/components/admin/form-bits";
import { formatDate, formatMoney, type Lang } from "@/lib/i18n";

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
  return (
    <>
      <Panel
        title="Pagos por revisar"
        description="El aprendiz ya tiene acceso. Rechazar lo devuelve al estado anterior."
      >
        {pending.length === 0 ? (
          <Empty>No hay pagos pendientes.</Empty>
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
                  Reportado {formatDate(payment.declaredAt, lang)} · cubre{" "}
                  {formatDate(payment.periodStart, lang)} →{" "}
                  {formatDate(payment.periodEnd, lang)}
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
                    submitLabel="Confirmar"
                    tone="primary"
                    hidden={{ paymentId: payment.id, decision: "CONFIRMED" }}
                  >
                    <Field label="Nota (opcional)" name="note" />
                  </ActionForm>
                  <ActionForm
                    action={decidePayment}
                    submitLabel="Rechazar"
                    tone="danger"
                    hidden={{ paymentId: payment.id, decision: "REJECTED" }}
                  >
                    <Field label="Motivo" name="note" required />
                  </ActionForm>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Decisiones recientes">
        {decided.length === 0 ? (
          <Empty>Sin decisiones todavía.</Empty>
        ) : (
          <TableScroll>
            <thead>
              <tr>
                <Th>Aprendiz</Th>
                <Th>Organización</Th>
                <Th>Monto</Th>
                <Th>Decisión</Th>
                <Th>Nota</Th>
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
                      {payment.reviewState === "CONFIRMED" ? "confirmado" : "rechazado"}
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
