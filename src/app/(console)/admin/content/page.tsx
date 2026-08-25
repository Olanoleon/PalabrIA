import { requireRole } from "@/lib/rbac";
import { adminContext, areaTagsFor, contentTree } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { adminNav } from "@/components/admin/admin-nav";
import { AreasList } from "@/components/admin/areas-list";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminContentPage() {
  const user = await requireRole("ORG_ADMIN");
  const { lang, org } = await adminContext(user);
  const [areas, tags] = await Promise.all([
    contentTree(user),
    areaTagsFor(user),
  ]);

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? adminT(lang).titleOrg}
      nav={adminNav(lang)}
      active="/admin/content"
    >
      <Breadcrumb trail={[{ label: adminT(lang).navContent }]} />
      <AreasList areas={areas} tags={tags} base="/admin" lang={lang} />
    </AdminShell>
  );
}
