import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, unitForAdmin } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { adminNav } from "@/components/admin/admin-nav";
import { GenerateUnit } from "@/components/admin/generate-unit";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { adminT } from "@/lib/i18n-admin";
import { readGenerationInput } from "@/lib/generation-input";

export default async function AdminRegeneratePage({
  params,
}: PageProps<"/admin/unit/[unitId]/regenerate">) {
  const { unitId } = await params;
  const user = await requireRole("ORG_ADMIN");
  const { lang, org } = await adminContext(user);
  const unit = await unitForAdmin(user, unitId);
  if (!unit) notFound();

  return (
    <AdminShell
      lang={lang}
      title={org?.name ?? adminT(lang).titleOrg}
      nav={adminNav(lang)}
    >
      <Breadcrumb
        trail={[
          { label: adminT(lang).navContent, href: "/admin/content" },
          { label: unit.area.name, href: `/admin/content/${unit.area.id}` },
          { label: unit.name, href: `/admin/unit/${unit.id}` },
          { label: adminT(lang).regenerateLink },
        ]}
      />
      <GenerateUnit
        areaId={unit.area.id}
        areaName={unit.area.name}
        base="/admin"
        lang={lang}
        replacing={{
          unitId: unit.id,
          unitName: unit.name,
          currentDifficulty: unit.difficulty,
          currentWordCount: unit.words.length,
          previousInput: readGenerationInput(unit.generationInput),
        }}
      />
    </AdminShell>
  );
}
