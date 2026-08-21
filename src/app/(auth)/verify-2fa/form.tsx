"use client";

import { resendTwoFactor, verifyTwoFactor } from "@/lib/actions/auth";
import { AuthForm } from "@/components/ui/auth-form";
import { TextField } from "@/components/ui/field";
import { t, type Lang } from "@/lib/i18n";

export function TwoFactorForm({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <div className="flex flex-col gap-4">
      <AuthForm action={verifyTwoFactor} lang={lang} submitLabel={d.twoFaCta}>
        <TextField
          label={d.twoFaLabel}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          className="text-center font-mono text-[22px] tracking-[0.3em]"
          required
        />
      </AuthForm>
      <AuthForm
        action={resendTwoFactor}
        lang={lang}
        submitLabel={d.twoFaResend}
      />
    </div>
  );
}
