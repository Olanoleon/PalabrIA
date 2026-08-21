import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, areaForAdmin, contentTree } from "@/lib/admin-data";
import {
  AdminShell,
  GlobalModeBanner,
  OrgModeBanner,
} from "@/components/admin/shell";
import { SUPER_NAV } from "@/components/admin/admin-nav";
import { ContentPanel } from "@/components/admin/content-panel";
import { LeaveOrgMode } from "@/components/admin/leave-org-mode";

export default async function SuperAreaPage({
  params,
}: PageProps<"/super/content/[areaId]">) {
  const { areaId } = await params;
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const area = await areaForAdmin(user, areaId);
  if (!area) notFound();
  const areas = (await contentTree(user)).filter((a) => a.id === areaId);

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
      actions={
        <Link
          href={`/super/content/${areaId}/generate`}
          className="press rounded-xl border-2 border-ink bg-brand px-[14px] py-[9px] text-[13px] font-bold text-brand-ink hard-1"
        >
          Crear unidad con IA
        </Link>
      }
    >
      <ContentPanel areas={areas} base="/super" />
    </AdminShell>
  );
}
