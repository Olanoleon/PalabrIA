import { requireRole } from "@/lib/rbac";
import { adminContext, learnerRows } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { LearnersPanel } from "@/components/admin/learners-panel";

export default async function AdminLearnersPage() {
  const user = await requireRole("ORG_ADMIN");
  const { lang, org, orgId } = await adminContext(user);
  if (!orgId) throw new Error("Org admin without an organization");
  const learners = await learnerRows(orgId);

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? "Organización"}
      nav={ADMIN_NAV}
      active="/admin/learners"
    >
      <LearnersPanel learners={learners} lang={lang} />
    </AdminShell>
  );
}
