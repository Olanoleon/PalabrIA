import { requireRole } from "@/lib/rbac";
import {
  adminContext,
  pendingPayments,
  recentPaymentDecisions,
} from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { SUPER_NAV } from "@/components/admin/admin-nav";
import { PaymentsPanel } from "@/components/admin/payments-panel";

export default async function SuperPaymentsPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang } = await adminContext(user);
  const [pending, decided] = await Promise.all([
    pendingPayments(),
    recentPaymentDecisions(),
  ]);

  return (
    <AdminShell
      lang={lang}
      title="Plataforma"
      nav={SUPER_NAV}
      active="/super/payments"
    >
      <PaymentsPanel pending={pending} decided={decided} lang={lang} />
    </AdminShell>
  );
}
