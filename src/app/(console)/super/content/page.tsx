import { requireRole } from "@/lib/rbac";
import { adminContext, contentTree } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { SUPER_NAV } from "@/components/admin/admin-nav";
import { AreasList } from "@/components/admin/areas-list";
import { GlobalModeBanner, OrgModeBanner } from "@/components/admin/shell";
import { LeaveOrgMode } from "@/components/admin/leave-org-mode";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function SuperContentPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const areas = await contentTree(user);

  return (
    <AdminShell
      lang={lang}
      title="Plataforma"
      nav={SUPER_NAV}
      active="/super/content"
      banner={
        org ? (
          <OrgModeBanner orgName={org.name} onLeaveHref={<LeaveOrgMode />} />
        ) : (
          <GlobalModeBanner />
        )
      }
    >
      <Breadcrumb trail={[{ label: "Contenido" }]} />
      <AreasList areas={areas} base="/super" />
    </AdminShell>
  );
}
