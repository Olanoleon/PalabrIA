"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/**
 * Thin wrapper for the short auth forms: hidden language field, a single
 * message slot, and a pending-aware submit button.
 */
export function AuthForm({
  action,
  lang,
  submitLabel,
  children,
  hidden,
  secondary,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  lang: string;
  submitLabel: string;
  children?: React.ReactNode;
  hidden?: Record<string, string>;
  secondary?: React.ReactNode;
}) {
  const [state, submit, pending] = useActionState(action, {});
  const message = state.error ?? state.notice;

  return (
    <form action={submit} className="flex flex-col gap-[9px]">
      <input type="hidden" name="lang" value={lang} />
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <Button type="submit" disabled={pending} className="mt-1 rounded-[18px] py-[15px]">
        {submitLabel}
      </Button>
      {message ? (
        <div
          role="status"
          className={cn(
            "animate-rise rounded-2xl border-2 border-ink px-[14px] py-3 text-[12.5px] font-medium",
            state.error ? "bg-cream text-brand-dark" : "bg-pass-soft text-pass-deep",
          )}
        >
          {message}
        </div>
      ) : null}
      {secondary}
    </form>
  );
}
