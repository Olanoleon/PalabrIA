import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, areaForAdmin, contentTree } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { ContentPanel } from "@/components/admin/content-panel";
import { GenerateUnitLink } from "@/components/admin/generate-unit-link";

export default async function AdminAreaPage({
  params,
}: PageProps<"/admin/content/[areaId]">) {
  const { areaId } = await params;
  const user = await requireRole("ORG_ADMIN");
  const { lang, org } = await adminContext(user);
  const area = await areaForAdmin(user, areaId);
  if (!area) notFound();
  const areas = (await contentTree(user)).filter((a) => a.id === areaId);

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? "Organización"}
      nav={ADMIN_NAV}
      active="/admin/content"
      actions={
        <GenerateUnitLink areaId={areaId} base="/admin" />
      }
    >
      <ContentPanel areas={areas} base="/admin" />
    </AdminShell>
  );
}
