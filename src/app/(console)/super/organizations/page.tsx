import { requireRole } from "@/lib/rbac";
import { adminContext, organizationRows } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { SUPER_NAV } from "@/components/admin/admin-nav";
import { OrganizationsPanel } from "@/components/admin/organizations-panel";

export default async function SuperOrganizationsPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, orgId } = await adminContext(user);
  const organizations = await organizationRows();

  return (
    <AdminShell
      lang={lang}
      title="Plataforma"
      nav={SUPER_NAV}
      active="/super/organizations"
    >
      <OrganizationsPanel organizations={organizations} activeOrgId={orgId} />
    </AdminShell>
  );
}
