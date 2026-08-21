import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, areaForAdmin } from "@/lib/admin-data";
import {
  AdminShell,
  GlobalModeBanner,
  OrgModeBanner,
} from "@/components/admin/shell";
import { SUPER_NAV } from "@/components/admin/admin-nav";
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
      <Breadcrumb
        trail={[
          { label: "Contenido", href: "/super/content" },
          { label: area.name, href: `/super/content/${area.id}` },
          { label: "Nueva unidad con IA" },
        ]}
      />
      <GenerateUnit areaId={area.id} areaName={area.name} base="/super" />
    </AdminShell>
  );
}
