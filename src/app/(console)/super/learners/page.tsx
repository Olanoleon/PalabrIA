import { requireRole } from "@/lib/rbac";
import { adminContext, learnerRows, organizationRows } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { LearnersPanel } from "@/components/admin/learners-panel";
import { Panel, Empty } from "@/components/admin/pieces";

/**
 * Platform-wide learner management. The Super Admin can create a learner in any
 * organization, so the invite form gets an organization picker.
 */
export default async function SuperLearnersPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang } = await adminContext(user);
  const organizations = await organizationRows();

  const perOrg = await Promise.all(
    organizations.map(async (org) => ({
      org,
      learners: await learnerRows(org.id),
    })),
  );

  return (
    <AdminShell
      lang={lang}
      title={adminT(lang).titlePlatform}
      nav={superNav(lang)}
      active="/super/learners"
    >
      {organizations.length === 0 ? (
        <Panel title="Aprendices">
          <Empty>Crea una organización antes de añadir aprendices.</Empty>
        </Panel>
      ) : (
        perOrg.map(({ org, learners }) => (
          <div key={org.id} className="flex flex-col gap-2">
            <h2 className="font-display text-[15px] font-semibold uppercase tracking-[0.04em] text-muted">
              {org.name}
            </h2>
            <LearnersPanel
              learners={learners}
              lang={lang}
              organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
            />
          </div>
        ))
      )}
    </AdminShell>
  );
}
