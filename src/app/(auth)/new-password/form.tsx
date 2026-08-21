"use client";

import { changePassword } from "@/lib/actions/auth";
import { AuthForm } from "@/components/ui/auth-form";
import { PasswordField } from "@/components/ui/field";
import { t, type Lang } from "@/lib/i18n";

export function NewPasswordForm({ lang }: { lang: Lang }) {
  const d = t(lang);
  return (
    <AuthForm action={changePassword} lang={lang} submitLabel={d.newPwCta}>
      <PasswordField
        label={d.newPwLabel}
        name="password"
        autoComplete="new-password"
        minLength={8}
        showLabel={d.pwShow}
        hideLabel={d.pwHide}
        required
      />
      <div className="mt-[5px]">
        <PasswordField
          label={d.newPwConfirm}
          name="confirm"
          autoComplete="new-password"
          minLength={8}
          showLabel={d.pwShow}
          hideLabel={d.pwHide}
          required
        />
      </div>
    </AuthForm>
  );
}
