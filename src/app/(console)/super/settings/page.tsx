import { requireRole } from "@/lib/rbac";
import { adminContext } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import { AdminShell } from "@/components/admin/shell";
import { superNav } from "@/components/admin/admin-nav";
import { SettingsPanel } from "@/components/admin/settings-panel";
import { senderAddress, usingDefaultSender } from "@/lib/resend";

export default async function SuperSettingsPage() {
  const user = await requireRole("SUPER_ADMIN");
  const { lang, settings } = await adminContext(user);

  return (
    <AdminShell
      lang={lang}
      title={adminT(lang).titlePlatform}
      nav={superNav(lang)}
      active="/super/settings"
    >
      <SettingsPanel
        settings={settings}
        hasOpenAiKey={Boolean(process.env.OPENAI_API_KEY)}
        hasResendKey={Boolean(process.env.RESEND_API_KEY)}
        sender={senderAddress()}
        defaultSender={usingDefaultSender()}
        lang={lang}
      />
    </AdminShell>
  );
}
