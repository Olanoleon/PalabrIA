import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, unitForAdmin } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { adminNav } from "@/components/admin/admin-nav";
import { UnitEditor } from "@/components/admin/unit-editor";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminUnitPage({
  params,
}: PageProps<"/admin/unit/[unitId]">) {
  const { unitId } = await params;
  const user = await requireRole("ORG_ADMIN");
  const { lang, org } = await adminContext(user);
  const unit = await unitForAdmin(user, unitId);
  if (!unit) notFound();

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? adminT(lang).titleOrg}
      nav={adminNav(lang)}
      active="/admin/content"
    >
      <Breadcrumb
        trail={[
          { label: adminT(lang).navContent, href: "/admin/content" },
          { label: unit.area.name, href: `/admin/content/${unit.area.id}` },
          { label: unit.name },
        ]}
      />
      <UnitEditor unit={unit} base="/admin" lang={lang} />
    </AdminShell>
  );
}
