"use client";

import { savePlatformSettings } from "@/lib/actions/super";
import { Panel } from "@/components/admin/pieces";
import { ActionForm, Field } from "@/components/admin/form-bits";
import type { Settings } from "@/lib/billing";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

/**
 * Platform settings. The Bre-B key here is what every learner's QR renders
 * from, so a typo stops payments platform-wide.
 */
export function SettingsPanel({
  settings,
  hasOpenAiKey,
  hasResendKey,
  sender,
  defaultSender,
  lang,
}: {
  settings: Settings;
  hasOpenAiKey: boolean;
  hasResendKey: boolean;
  sender: string;
  defaultSender: boolean;
  lang: Lang;
}) {
  const d = adminT(lang);
  return (
    <>
      <Panel
        title={d.settingsBillingTitle}
        description={d.settingsBillingNote}
      >
        <ActionForm action={savePlatformSettings} submitLabel={d.settingsSave}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={d.settingsKey}
              name="brebKey"
              defaultValue={settings.brebKey}
              placeholder="@palabria"
              hint={d.settingsKeyHint}
            />
            <Field
              label={d.settingsAmount}
              name="monthlyAmount"
              type="number"
              min={0}
              defaultValue={settings.monthlyAmount}
            />
            <Field
              label={d.settingsCurrency}
              name="currency"
              maxLength={3}
              defaultValue={settings.currency}
              hint={d.settingsCurrencyHint}
            />
            <Field
              label={d.settingsGrace}
              name="graceDays"
              type="number"
              min={0}
              max={60}
              defaultValue={settings.graceDays}
              hint={d.settingsGraceHint}
            />
            <Field
              label={d.settingsModel}
              name="openaiModel"
              defaultValue={settings.openaiModel}
              hint={d.settingsModelHint}
            />
          </div>
        </ActionForm>
      </Panel>

      <Panel title={d.settingsIntegrations} description={d.settingsIntegrationsNote}>
        <ul className="flex flex-col gap-2 text-[12.5px]">
          <li className="flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-3 py-2">
            <strong className="flex-1">OPENAI_API_KEY</strong>
            {hasOpenAiKey ? (
              <span className="font-bold text-pass-deep">{d.settingsConfigured}</span>
            ) : (
              <span className="font-bold text-brand-dark">
                {d.settingsMissingOpenAi}
              </span>
            )}
          </li>
          <li className="flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-3 py-2">
            <strong className="flex-1">RESEND_API_KEY</strong>
            {hasResendKey ? (
              <span className="font-bold text-pass-deep">{d.settingsConfigured}</span>
            ) : (
              <span className="font-bold text-brand-dark">
                {d.settingsMissingResend}
              </span>
            )}
          </li>
          <li className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-ink bg-cream px-3 py-2">
            <strong>{d.settingsSender}</strong>
            <span className="font-mono text-[11.5px]">{sender}</span>
            {defaultSender ? (
              <span className="ml-auto text-[11.5px] text-body">
                {d.settingsSharedSender}
              </span>
            ) : (
              <span className="ml-auto font-bold text-pass-deep">{d.settingsOwnDomain}</span>
            )}
          </li>
        </ul>
      </Panel>
    </>
  );
}
