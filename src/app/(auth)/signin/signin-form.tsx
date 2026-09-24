"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/primitives";
import { PasswordField, TextField } from "@/components/ui/field";
import { t, type Lang } from "@/lib/i18n";

const EMPTY: FormState = {};

export function SignInForm({ lang }: { lang: Lang }) {
  // The dictionary holds functions, which cannot cross the server/client
  // boundary — so derive it here from the language alone.
  const d = t(lang);
  const [state, action, pending] = useActionState(signIn, EMPTY);

  const message = state.error;

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
          className="animate-rise rounded-2xl border-2 border-ink bg-cream px-[14px] py-3 text-[12.5px] font-medium text-brand-dark"
        >
          {message}
        </div>
      ) : null}

      {/*
        A link, not a second form. It used to submit whatever was typed in the
        field above, which meant asking for a reset before typing an address
        silently asked for nothing at all.
      */}
      <Link
        href="/forgot-password"
        className="mt-[2px] self-center text-[12.5px] font-bold text-brand-deep underline underline-offset-[3px]"
      >
        {d.signinForgot}
      </Link>
    </div>
  );
}
