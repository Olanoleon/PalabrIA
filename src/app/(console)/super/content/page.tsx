import { requireRole } from "@/lib/rbac";
import { adminContext, contentTree } from "@/lib/admin-data";
import {
  AdminShell,
  GlobalModeBanner,
  OrgModeBanner,
} from "@/components/admin/shell";
import { SUPER_NAV } from "@/components/admin/admin-nav";
import { ContentPanel } from "@/components/admin/content-panel";
import { LeaveOrgMode } from "@/components/admin/leave-org-mode";

/**
 * Content management in whichever of the Super Admin's two contexts is active:
 * the Global Template, or one organization's own copy (Organization Mode). The
 * banner makes which one unmistakable.
 */
export default async function SuperContentPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const areas = await contentTree(user);

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
    >
      <ContentPanel areas={areas} base="/super" />
    </AdminShell>
  );
}
