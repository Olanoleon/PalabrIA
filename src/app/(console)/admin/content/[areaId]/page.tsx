import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, areaGroupsFor, contentTree } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { adminNav } from "@/components/admin/admin-nav";
import { AreaDetail } from "@/components/admin/area-detail";
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function AdminAreaPage({
  params,
}: PageProps<"/admin/content/[areaId]">) {
  const { areaId } = await params;
  const user = await requireRole("ORG_ADMIN");
  const { lang, org } = await adminContext(user);
  const [tree, groups] = await Promise.all([
    contentTree(user),
    areaGroupsFor(user),
  ]);
  const area = tree.find((a) => a.id === areaId);
  if (!area) notFound();

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
          { label: area.name },
        ]}
      />
      <AreaDetail area={area} groups={groups} base="/admin" lang={lang} />
    </AdminShell>
  );
}
