import { requireRole } from "@/lib/rbac";
import {
  adminContext,
  allLearnerRows,
  learnerDashboard,
  organizationRows,
} from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { PlatformLearners } from "@/components/admin/platform-learners";
import { Panel, Empty } from "@/components/admin/pieces";

/**
 * Platform-wide learner management.
 *
 * One table across every organisation, rather than a panel per organisation:
 * the Super Admin looking for a person rarely knows which company they signed
 * up under, and the old layout repeated the whole create form once per org.
 */
export default async function SuperLearnersPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const [organizations, learners, dashboard] = await Promise.all([
    organizationRows(),
    allLearnerRows(),
    learnerDashboard(),
  ]);

  return (
    <AdminShell
      lang={lang}
      title={adminT(lang).titlePlatform}
      nav={superNav(lang, Boolean(org))}
      active="/super/learners"
    >
      {organizations.length === 0 ? (
        <Panel title={adminT(lang).learnersTitle}>
          <Empty>{adminT(lang).learnerNeedsOrg}</Empty>
        </Panel>
      ) : (
        <PlatformLearners
          learners={learners}
          // Only what a picker and a filter need; organizationRows also carries
          // admin emails and per-org counts that have no business here.
          organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
          dashboard={dashboard}
          lang={lang}
        />
      )}
    </AdminShell>
  );
}
