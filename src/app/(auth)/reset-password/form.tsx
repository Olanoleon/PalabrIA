"use client";

import { resetPassword } from "@/lib/actions/auth";
import { AuthForm } from "@/components/ui/auth-form";
import { PasswordField } from "@/components/ui/field";
import { t, type Lang } from "@/lib/i18n";

export function ResetPasswordForm({ lang, token }: { lang: Lang; token: string }) {
  const d = t(lang);
  return (
    <AuthForm
      action={resetPassword}
      lang={lang}
      submitLabel={d.newPwCta}
      hidden={{ token }}
    >
      {/*
        No minLength: a learner's key is a 4-digit PIN and an administrator's is
        8+ characters, and this screen cannot tell which it is looking at until
        the token is consumed server-side. A hardcoded 8 here silently made the
        form unsubmittable for every learner.
      */}
      <PasswordField
        label={d.newPwLabel}
        name="password"
        autoComplete="new-password"
        showLabel={d.pwShow}
        hideLabel={d.pwHide}
        required
      />
      <div className="mt-[5px]">
        <PasswordField
          label={d.newPwConfirm}
          name="confirm"
          autoComplete="new-password"
          showLabel={d.pwShow}
          hideLabel={d.pwHide}
          required
        />
      </div>
      <p className="text-[12px] leading-[1.45] text-muted">{d.resetHint}</p>
    </AuthForm>
  );
}
