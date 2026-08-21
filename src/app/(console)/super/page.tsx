import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { adminContext, platformMetrics } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { SUPER_NAV } from "@/components/admin/admin-nav";
import { Panel, StatTile } from "@/components/admin/pieces";
import { formatMoney } from "@/lib/i18n";

export default async function SuperDashboard() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang } = await adminContext(user);
  const metrics = await platformMetrics();

  const editRate = metrics.generatedUnits
    ? Math.round((metrics.editedAfterGeneration / metrics.generatedUnits) * 100)
    : 0;

  return (
    <AdminShell lang={lang} title="Plataforma" nav={SUPER_NAV} active="/super">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          value={metrics.activeOrganizations}
          label="Organizaciones activas"
          hint={`${metrics.organizations} en total`}
        />
        <StatTile
          value={metrics.activeLearners}
          label="Aprendices activos"
          hint={`${metrics.learners} en total`}
          tone="pass"
        />
        <StatTile
          value={formatMoney(metrics.monthRevenue, metrics.currency, lang)}
          label="Recibido este mes"
          hint="Solo pagos confirmados"
          tone="soft"
        />
        <StatTile
          value={metrics.pendingPayments}
          label="Pagos por revisar"
          tone={metrics.pendingPayments > 0 ? "warn" : "paper"}
        />
      </div>

      <Panel
        title="Generación con IA"
        description="Cuánto se edita lo que produce el modelo."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile value={metrics.generatedUnits} label="Unidades generadas" />
          <StatTile
            value={`${editRate}%`}
            label="Editadas tras generar"
            hint={`${metrics.editedAfterGeneration} de ${metrics.generatedUnits}`}
          />
        </div>
      </Panel>

      {metrics.pendingPayments > 0 ? (
        <Panel title="Pendiente de tu revisión">
          <Link
            href="/super/payments"
            className="press inline-flex rounded-xl border-2 border-ink bg-brand px-[14px] py-[9px] text-[13px] font-bold text-brand-ink hard-1"
          >
            Revisar {metrics.pendingPayments} pago(s)
          </Link>
        </Panel>
      ) : null}
    </AdminShell>
  );
}
