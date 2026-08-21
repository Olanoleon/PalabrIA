import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, areaForAdmin } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { GenerateUnit } from "@/components/admin/generate-unit";

export default async function AdminGeneratePage({
  params,
}: PageProps<"/admin/content/[areaId]/generate">) {
  const { areaId } = await params;
  const user = await requireRole("ORG_ADMIN");
  const { lang, org } = await adminContext(user);
  const area = await areaForAdmin(user, areaId);
  if (!area) notFound();

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? "Organización"}
      nav={ADMIN_NAV}
      active="/admin/content"
    >
      <GenerateUnit areaId={area.id} areaName={area.name} base="/admin" />
    </AdminShell>
  );
}
