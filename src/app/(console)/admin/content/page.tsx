import { requireRole } from "@/lib/rbac";
import { adminContext, contentTree } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { AreasList } from "@/components/admin/areas-list";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminContentPage() {
  const user = await requireRole("ORG_ADMIN");
  const { lang, org } = await adminContext(user);
  const areas = await contentTree(user);

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? "Organización"}
      nav={ADMIN_NAV}
      active="/admin/content"
    >
      <Breadcrumb trail={[{ label: "Contenido" }]} />
      <AreasList areas={areas} base="/admin" />
    </AdminShell>
  );
}
