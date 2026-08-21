import { requireRole } from "@/lib/rbac";
import { adminContext } from "@/lib/admin-data";
import { AdminShell } from "@/components/admin/shell";
import { SUPER_NAV } from "@/components/admin/admin-nav";
import { SettingsPanel } from "@/components/admin/settings-panel";

export default async function SuperSettingsPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, settings } = await adminContext(user);

  return (
    <AdminShell
      lang={lang}
      title="Plataforma"
      nav={SUPER_NAV}
      active="/super/settings"
    >
      <SettingsPanel
        settings={settings}
        hasOpenAiKey={Boolean(process.env.OPENAI_API_KEY)}
        hasResendKey={Boolean(process.env.RESEND_API_KEY)}
      />
    </AdminShell>
  );
}
