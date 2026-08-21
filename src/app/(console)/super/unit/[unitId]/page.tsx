import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminT } from "@/lib/i18n-admin";
import { adminContext, unitForAdmin } from "@/lib/admin-data";
import {
  AdminShell,
  GlobalModeBanner,
  OrgModeBanner,
} from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { UnitEditor } from "@/components/admin/unit-editor";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { LeaveOrgMode } from "@/components/admin/leave-org-mode";

export default async function SuperUnitPage({
  params,
}: PageProps<"/super/unit/[unitId]">) {
  const { unitId } = await params;
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const unit = await unitForAdmin(user, unitId);
  if (!unit) notFound();

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
          { label: unit.area.name, href: `/super/content/${unit.area.id}` },
          { label: unit.name },
        ]}
      />
      <UnitEditor unit={unit} base="/super" lang={lang} />
    </AdminShell>
  );
}
