import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, unitForAdmin } from "@/lib/admin-data";
import {
  AdminShell,
  GlobalModeBanner,
  OrgModeBanner,
} from "@/components/admin/shell";
import { SUPER_NAV } from "@/components/admin/admin-nav";
import { UnitEditor } from "@/components/admin/unit-editor";
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
      <UnitEditor unit={unit} base="/super" />
    </AdminShell>
  );
}
