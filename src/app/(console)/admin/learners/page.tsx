import { requireRole } from "@/lib/rbac";
import { adminContext, learnerRows } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { adminNav } from "@/components/admin/admin-nav";
import { LearnersPanel } from "@/components/admin/learners-panel";

export default async function AdminLearnersPage() {
  const user = await requireRole("ORG_ADMIN");
  const { lang, org, orgId } = await adminContext(user);
  if (!orgId) throw new Error("Org admin without an organization");
  const learners = await learnerRows(orgId);

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? adminT(lang).titleOrg}
      nav={adminNav(lang)}
      active="/admin/learners"
    >
      <LearnersPanel learners={learners} lang={lang} />
    </AdminShell>
  );
}
