import { requireRole } from "@/lib/rbac";
import { adminContext, atRiskLearners, orgMetrics } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { Panel, StatTile, Tag, Empty } from "@/components/admin/pieces";
import { formatDate } from "@/lib/i18n";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "al día",
  TRIAL: "prueba",
  PAST_DUE: "vencido",
  SUSPENDED: "suspendido",
  OVERRIDE_ACTIVE: "forzado activo",
  DISABLED: "desactivado",
};

export default async function AdminDashboard() {
  const user = await requireRole("ORG_ADMIN");
  const { lang, org, orgId } = await adminContext(user);
  if (!orgId) throw new Error("Org admin without an organization");

  // Whoever an administrator should chase: idle for a week, or without access.
  const [metrics, atRisk] = await Promise.all([
    orgMetrics(orgId),
    atRiskLearners(orgId),
  ]);

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? "Organización"}
      nav={ADMIN_NAV}
      active="/admin"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile value={metrics.learners} label="Aprendices" />
        <StatTile
          value={metrics.activeLearners}
          label="Activos (7 días)"
          tone="pass"
        />
        <StatTile
          value={`${Math.round(metrics.completionRate * 100)}%`}
          label="Unidades aprobadas"
          hint={`${metrics.unitsPassed} de ${metrics.unitsAttempted} intentadas`}
        />
        <StatTile
          value={metrics.atRisk}
          label="En riesgo"
          tone={metrics.atRisk > 0 ? "warn" : "paper"}
          hint="Sin actividad reciente o sin acceso"
        />
      </div>

      <Panel title="Estado de pago" description="Recuento por estado efectivo.">
        <div className="flex flex-wrap gap-2">
          {Object.entries(metrics.billing).length === 0 ? (
            <Empty>Sin aprendices todavía.</Empty>
          ) : (
            Object.entries(metrics.billing).map(([status, count]) => (
              <span
                key={status}
                className="rounded-xl border-2 border-ink bg-surface px-3 py-2 text-[12.5px] font-semibold flat-1"
              >
                {STATUS_LABEL[status] ?? status}: {count}
              </span>
            ))
          )}
        </div>
      </Panel>

      <Panel
        title="Aprendices en riesgo"
        description="Empieza por aquí si quieres recuperar gente."
      >
        {atRisk.length === 0 ? (
          <Empty>Nadie en riesgo ahora mismo.</Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {atRisk.slice(0, 10).map((learner) => (
              <li
                key={learner.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-[12.5px]"
              >
                <strong>{learner.name}</strong>
                <span className="text-muted-2">{learner.email}</span>
                {!learner.hasAccess ? (
                  <Tag tone="danger">
                    {STATUS_LABEL[learner.effectiveStatus] ?? learner.effectiveStatus}
                  </Tag>
                ) : null}
                <span className="ml-auto text-muted-2">
                  {learner.lastActiveAt
                    ? `última actividad ${formatDate(learner.lastActiveAt, lang)}`
                    : "nunca ha entrado"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminShell>
  );
}
