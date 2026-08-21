import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, areaForAdmin } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { adminNav } from "@/components/admin/admin-nav";
import { GenerateUnit } from "@/components/admin/generate-unit";
import { Breadcrumb } from "@/components/admin/breadcrumb";

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
      title={org?.name ?? adminT(lang).titleOrg}
      nav={adminNav(lang)}
      active="/admin/content"
    >
      <Breadcrumb
        trail={[
          { label: adminT(lang).navContent, href: "/admin/content" },
          { label: area.name, href: `/admin/content/${area.id}` },
          { label: adminT(lang).generateLink },
        ]}
      />
      <GenerateUnit areaId={area.id} areaName={area.name} base="/admin" lang={lang} />
    </AdminShell>
  );
}
