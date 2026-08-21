"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset, signIn, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/primitives";
import { PasswordField, TextField } from "@/components/ui/field";
import { t, type Lang } from "@/lib/i18n";

const EMPTY: FormState = {};

export function SignInForm({ lang }: { lang: Lang }) {
  // The dictionary holds functions, which cannot cross the server/client
  // boundary — so derive it here from the language alone.
  const d = t(lang);
  // The email is held here so the forgot-password form can reuse it without
  // making the learner type it twice.
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState(signIn, EMPTY);
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    EMPTY,
  );

  const message = state.error ?? resetState.notice;
  const isError = Boolean(state.error);

  return (
    <div className="flex flex-col gap-[9px]">
      <form action={action} className="flex flex-col gap-[9px]">
        <input type="hidden" name="lang" value={lang} />
        <TextField
          label={d.signinLabel}
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="ana.rueda@arkusnexus.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <div className="mt-[5px]">
          <PasswordField
            label={d.signinPw}
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            showLabel={d.pwShow}
            hideLabel={d.pwHide}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-[18px] py-[15px]"
        >
          {d.signinCta}
        </Button>
      </form>

      {message ? (
        <div
          role="status"
          className={
            "animate-rise rounded-2xl border-2 border-ink px-[14px] py-3 text-[12.5px] font-medium " +
            (isError ? "bg-cream text-brand-dark" : "bg-pass-soft text-pass-deep")
          }
        >
          {message}
        </div>
      ) : null}

      <form action={resetAction} className="self-center">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={resetPending}
          className="mt-[2px] text-[12.5px] font-bold text-brand-deep underline underline-offset-[3px] disabled:opacity-60"
        >
          {d.signinForgot}
        </button>
      </form>
    </div>
  );
}
