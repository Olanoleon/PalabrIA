"use client";

import { requestPasswordReset } from "@/lib/actions/auth";
import { AuthForm } from "@/components/ui/auth-form";
import { TextField } from "@/components/ui/field";
import { t, type Lang } from "@/lib/i18n";

export function ForgotForm({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <AuthForm action={requestPasswordReset} lang={lang} submitLabel={d.forgotCta}>
      <TextField
        label={d.signinLabel}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        placeholder="ana.rueda@arkusnexus.com"
        required
        autoFocus
      />
    </AuthForm>
  );
}
