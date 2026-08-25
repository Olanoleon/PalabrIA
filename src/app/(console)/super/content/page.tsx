import { requireRole } from "@/lib/rbac";
import { adminContext, areaTagsFor, contentTree } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { AreasList } from "@/components/admin/areas-list";
import { GlobalModeBanner, OrgModeBanner } from "@/components/admin/shell";
import { LeaveOrgMode } from "@/components/admin/leave-org-mode";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function SuperContentPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const [areas, tags] = await Promise.all([
    contentTree(user),
    areaTagsFor(user),
  ]);

  return (
    <AdminShell
      lang={lang}
      title={adminT(lang).titlePlatform}
      nav={superNav(lang, Boolean(org))}
      active="/super/content"
      banner={
        org ? (
          <OrgModeBanner orgName={org.name} onLeaveHref={<LeaveOrgMode lang={lang} />} lang={lang} />
        ) : (
          <GlobalModeBanner lang={lang} />
        )
      }
    >
      <Breadcrumb trail={[{ label: adminT(lang).navContent }]} />
      <AreasList areas={areas} tags={tags} base="/super" lang={lang} />
    </AdminShell>
  );
}
