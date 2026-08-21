import { requireRole } from "@/lib/rbac";
import {
  adminContext,
  pendingPayments,
  recentPaymentDecisions,
} from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { PaymentsPanel } from "@/components/admin/payments-panel";

export default async function SuperPaymentsPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const [pending, decided] = await Promise.all([
    pendingPayments(),
    recentPaymentDecisions(),
  ]);

  return (
    <AdminShell
      lang={lang}
      title={adminT(lang).titlePlatform}
      nav={superNav(lang, Boolean(org))}
      active="/super/payments"
    >
      <PaymentsPanel pending={pending} decided={decided} lang={lang} />
    </AdminShell>
  );
}
