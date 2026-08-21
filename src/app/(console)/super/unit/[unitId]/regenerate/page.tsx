import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { adminContext, unitForAdmin } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { GenerateUnit } from "@/components/admin/generate-unit";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { adminT } from "@/lib/i18n-admin";
import { readGenerationInput } from "@/lib/generation-input";

export default async function SuperRegeneratePage({
  params,
}: PageProps<"/super/unit/[unitId]/regenerate">) {
  const { unitId } = await params;
  const user = await requireRole("SUPER_ADMIN");
  const { lang, org } = await adminContext(user);
  const unit = await unitForAdmin(user, unitId);
  if (!unit) notFound();

  return (
    <AdminShell
      lang={lang}
      title={adminT(lang).titlePlatform}
      nav={superNav(lang, Boolean(org))}
    >
      <Breadcrumb
        trail={[
          { label: adminT(lang).navContent, href: "/super/content" },
          { label: unit.area.name, href: `/super/content/${unit.area.id}` },
          { label: unit.name, href: `/super/unit/${unit.id}` },
          { label: adminT(lang).regenerateLink },
        ]}
      />
      <GenerateUnit
        areaId={unit.area.id}
        areaName={unit.area.name}
        base="/super"
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
