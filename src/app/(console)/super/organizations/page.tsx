import { requireRole } from "@/lib/rbac";
import { adminContext, organizationRows } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { OrganizationsPanel } from "@/components/admin/organizations-panel";

export default async function SuperOrganizationsPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org, orgId } = await adminContext(user);
  const organizations = await organizationRows();
  // Invite links have to be absolute: they are pasted into WhatsApp and
  // email, not clicked inside the console.
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <AdminShell
      lang={lang}
      title={adminT(lang).titlePlatform}
      nav={superNav(lang, Boolean(org))}
      active="/super/organizations"
    >
      <OrganizationsPanel
        organizations={organizations}
        activeOrgId={orgId}
        appUrl={appUrl}
        lang={lang}
      />
    </AdminShell>
  );
}
