import { requireRole } from "@/lib/rbac";
import { adminContext, contentTree } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { ContentPanel } from "@/components/admin/content-panel";

export default async function AdminContentPage() {
  const user = await requireRole("ORG_ADMIN");
  const { lang, org } = await adminContext(user);
  const areas = await contentTree(user);

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? "Organización"}
      subtitle="Este es el contenido de tu organización. La plantilla global no se ve desde aquí."
      nav={ADMIN_NAV}
      active="/admin/content"
    >
      <ContentPanel areas={areas} base="/admin" />
    </AdminShell>
  );
}
