"use client";

import { savePlatformSettings } from "@/lib/actions/super";
import { Panel } from "@/components/admin/pieces";
import { ActionForm, Field } from "@/components/admin/form-bits";
import type { Settings } from "@/lib/billing";

/**
 * Platform settings. The Bre-B key here is what every learner's QR renders
 * from, so a typo stops payments platform-wide.
 */
export function SettingsPanel({
  settings,
  hasOpenAiKey,
  hasResendKey,
}: {
  settings: Settings;
  hasOpenAiKey: boolean;
  hasResendKey: boolean;
}) {
  return (
    <>
      <Panel
        title="Cobro"
        description="La llave Bre-B se muestra como QR a todos los aprendices."
      >
        <ActionForm action={savePlatformSettings} submitLabel="Guardar ajustes">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Llave Bre-B"
              name="brebKey"
              defaultValue={settings.brebKey}
              placeholder="@palabria"
              hint="Alfanumérica, teléfono, documento o correo."
            />
            <Field
              label="Mensualidad"
              name="monthlyAmount"
              type="number"
              min={0}
              defaultValue={settings.monthlyAmount}
            />
            <Field
              label="Moneda"
              name="currency"
              maxLength={3}
              defaultValue={settings.currency}
              hint="Código ISO de 3 letras."
            />
            <Field
              label="Días de gracia"
              name="graceDays"
              type="number"
              min={0}
              max={60}
              defaultValue={settings.graceDays}
              hint="Tras vencer, el acceso sigue estos días antes de suspenderse."
            />
            <Field
              label="Modelo de OpenAI"
              name="openaiModel"
              defaultValue={settings.openaiModel}
              hint="Se usa para generar unidades y descripciones de área."
            />
          </div>
        </ActionForm>
      </Panel>

      <Panel title="Integraciones" description="Las claves viven solo en el servidor.">
        <ul className="flex flex-col gap-2 text-[12.5px]">
          <li className="flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-3 py-2">
            <strong className="flex-1">OPENAI_API_KEY</strong>
            {hasOpenAiKey ? (
              <span className="font-bold text-pass-deep">configurada</span>
            ) : (
              <span className="font-bold text-brand-dark">
                falta — la generación con IA no funcionará
              </span>
            )}
          </li>
          <li className="flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-3 py-2">
            <strong className="flex-1">RESEND_API_KEY</strong>
            {hasResendKey ? (
              <span className="font-bold text-pass-deep">configurada</span>
            ) : (
              <span className="font-bold text-brand-dark">
                falta — no se envían códigos 2FA ni invitaciones
              </span>
            )}
          </li>
        </ul>
      </Panel>
    </>
  );
}
