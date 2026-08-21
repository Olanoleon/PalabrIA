import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminT } from "@/lib/i18n-admin";
import { adminContext, areaForAdmin } from "@/lib/admin-data";
import {
  AdminShell,
  GlobalModeBanner,
  OrgModeBanner,
} from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { GenerateUnit } from "@/components/admin/generate-unit";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { LeaveOrgMode } from "@/components/admin/leave-org-mode";

export default async function SuperGeneratePage({
  params,
}: PageProps<"/super/content/[areaId]/generate">) {
  const { areaId } = await params;
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const area = await areaForAdmin(user, areaId);
  if (!area) notFound();

  return (
    <AdminShell
      lang={lang}
      title={adminT(lang).titlePlatform}
      nav={superNav(lang)}
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
          { label: area.name, href: `/super/content/${area.id}` },
          { label: adminT(lang).generateLink },
        ]}
      />
      <GenerateUnit areaId={area.id} areaName={area.name} base="/super" lang={lang} />
    </AdminShell>
  );
}
