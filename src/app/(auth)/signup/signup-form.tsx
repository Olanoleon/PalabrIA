"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/ui/auth-form";
import { PasswordField, TextField } from "@/components/ui/field";
import { createLearnerAccount, lookupJoinCode } from "@/lib/actions/signup";
import { t, type Lang } from "@/lib/i18n";

/**
 * Registration. One form behind three doors: /signup with the code field
 * empty, /join/<code> with it pre-filled, or someone reading four digits out
 * over the phone.
 *
 * The code is confirmed as soon as it is typed rather than on submit. With only
 * 10,000 codes in play a typo can land on a real but wrong organisation, and
 * finding that out after the account exists is too late — so the form names
 * whoever it found before the learner commits.
 */
export function SignupForm({
  lang,
  initialCode = "",
  initialOrgName = null,
  demoOrgName,
}: {
  lang: Lang;
  initialCode?: string;
  /** Resolved server-side on /join/<code>, so the name is there on first paint. */
  initialOrgName?: string | null;
  /** Where an empty code leads. Null when the demo org is missing. */
  demoOrgName: string | null;
}) {
  const d = t(lang);
  const [code, setCode] = useState(initialCode);
  const [orgName, setOrgName] = useState<string | null>(initialOrgName);
  const [checked, setChecked] = useState(initialOrgName !== null);
  const [checking, startCheck] = useTransition();

  const check = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setOrgName(null);
      setChecked(false);
      return;
    }
    startCheck(async () => {
      const found = await lookupJoinCode(trimmed);
      setOrgName(found?.name ?? null);
      setChecked(true);
    });
  };

  const target =
    code.trim().length === 0
      ? demoOrgName
        ? { tone: "demo" as const, text: d.signupDemoJoining(demoOrgName) }
        : { tone: "bad" as const, text: d.signupNoDemo }
      : checking
        ? null
        : orgName
          ? { tone: "found" as const, text: d.signupJoining(orgName) }
          : checked
            ? { tone: "bad" as const, text: d.signupCodeBad }
            : null;

  return (
    <AuthForm
      action={createLearnerAccount}
      lang={lang}
      submitLabel={d.signupCta}
      secondary={
        <Link
          href="/signin"
          className="mt-1 self-center text-[12.5px] font-bold text-brand-deep underline underline-offset-[3px]"
        >
          {d.signupHaveAccount}
        </Link>
      }
    >
      <TextField
        label={`${d.signupCode} (${d.signupCodeOptional})`}
        name="code"
        value={code}
        onChange={(event) => {
          // Digits only, so a pasted "1234 " or "#1234" still works.
          const next = event.target.value.replace(/\D/g, "").slice(0, 4);
          setCode(next);
          setChecked(false);
          if (next.length === 4) check(next);
          if (next.length === 0) setOrgName(null);
        }}
        onBlur={(event) => check(event.target.value)}
        inputMode="numeric"
        pattern="[0-9]{4}"
        maxLength={4}
        autoComplete="off"
        placeholder="1234"
      />

      {target ? (
        <p
          className={
            "text-[12px] leading-[1.45] " +
            (target.tone === "bad" ? "font-semibold text-brand-dark" : "text-body")
          }
        >
          {target.text}
        </p>
      ) : (
        <p className="text-[12px] leading-[1.45] text-muted">{d.signupCodeHint}</p>
      )}

      <div className="mt-[5px]">
        <TextField
          label={d.signupName}
          name="name"
          autoComplete="name"
          minLength={2}
          maxLength={120}
          required
        />
      </div>
      <div className="mt-[5px]">
        <TextField
          label={d.signupEmail}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="mt-[5px]">
        <PasswordField
          label={d.signupPin}
          name="pin"
          autoComplete="new-password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          placeholder="••••"
          showLabel={d.pwShow}
          hideLabel={d.pwHide}
          required
        />
      </div>
      <div className="mt-[5px]">
        <PasswordField
          label={d.signupPinConfirm}
          name="confirm"
          autoComplete="new-password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          placeholder="••••"
          showLabel={d.pwShow}
          hideLabel={d.pwHide}
          required
        />
      </div>
      <p className="text-[12px] leading-[1.45] text-muted">{d.signupPinHint}</p>
    </AuthForm>
  );
}
