import { requireRole } from "@/lib/rbac";
import { adminContext, organizationRows } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { OrganizationsPanel } from "@/components/admin/organizations-panel";

export default async function SuperOrganizationsPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, orgId } = await adminContext(user);
  const organizations = await organizationRows();

  return (
    <AdminShell
      lang={lang}
      title={adminT(lang).titlePlatform}
      nav={superNav(lang)}
      active="/super/organizations"
    >
      <OrganizationsPanel
        organizations={organizations}
        activeOrgId={orgId}
        lang={lang}
      />
    </AdminShell>
  );
}
