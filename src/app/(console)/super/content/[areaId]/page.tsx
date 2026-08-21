import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, contentTree } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { AreaDetail } from "@/components/admin/area-detail";
import { GlobalModeBanner, OrgModeBanner } from "@/components/admin/shell";
import { LeaveOrgMode } from "@/components/admin/leave-org-mode";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function SuperAreaPage({
  params,
}: PageProps<"/super/content/[areaId]">) {
  const { areaId } = await params;
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const area = (await contentTree(user)).find((a) => a.id === areaId);
  if (!area) notFound();

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
      <Breadcrumb
        trail={[
          { label: adminT(lang).navContent, href: "/super/content" },
          { label: area.name },
        ]}
      />
      <AreaDetail area={area} base="/super" lang={lang} />
    </AdminShell>
  );
}
