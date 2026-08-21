import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, contentTree } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { AreaDetail } from "@/components/admin/area-detail";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminAreaPage({
  params,
}: PageProps<"/admin/content/[areaId]">) {
  const { areaId } = await params;
  const user = await requireRole("ORG_ADMIN");
  const { lang, org } = await adminContext(user);
  const area = (await contentTree(user)).find((a) => a.id === areaId);
  if (!area) notFound();

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? "Organización"}
      nav={ADMIN_NAV}
      active="/admin/content"
    >
      <Breadcrumb
        trail={[
          { label: "Contenido", href: "/admin/content" },
          { label: area.name },
        ]}
      />
      <AreaDetail area={area} base="/admin" />
    </AdminShell>
  );
}
