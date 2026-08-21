"use client";

import { useActionState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/lib/actions/admin";

export const INPUT =
  "w-full rounded-xl border-2 border-ink bg-surface px-3 py-[10px] text-[13.5px] font-medium outline-none placeholder:text-muted-3 focus:border-brand";

export function Field({
  label,
  hint,
  className,
  ...rest
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className={cn("flex flex-col gap-[6px]", className)}>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <input {...rest} className={INPUT} />
      {hint ? <span className="text-[11px] text-muted-2">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...rest
}: ComponentProps<"textarea"> & { label: string; hint?: string }) {
  return (
    <label className={cn("flex flex-col gap-[6px]", className)}>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <textarea {...rest} className={cn(INPUT, "min-h-[90px] leading-[1.5]")} />
      {hint ? <span className="text-[11px] text-muted-2">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  className,
  children,
  ...rest
}: ComponentProps<"select"> & { label: string }) {
  return (
    <label className={cn("flex flex-col gap-[6px]", className)}>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <select {...rest} className={INPUT}>
        {children}
      </select>
    </label>
  );
}

export function Message({ state }: { state: ActionState }) {
  const text = state.error ?? state.notice;
  if (!text) return null;
  return (
    <div
      role="status"
      className={cn(
        "animate-rise rounded-xl border-2 border-ink px-3 py-2 text-[12.5px] font-medium",
        state.error ? "bg-cream text-brand-dark" : "bg-pass-soft text-pass-deep",
      )}
    >
      {text}
    </div>
  );
}

const TONES = {
  primary: "border-ink bg-brand text-brand-ink hard-1",
  ai: "border-ink bg-ai text-ai-ink hard-1",
  secondary: "border-ink bg-surface text-ink hard-1",
  soft: "border-ink bg-brand-soft text-ink hard-1",
  danger: "border-ink bg-ink text-paper hard-1",
  quiet: "border-muted-line bg-locked text-muted-2",
} as const;

export function SmallButton({
  tone = "secondary",
  className,
  ...rest
}: ComponentProps<"button"> & { tone?: keyof typeof TONES }) {
  return (
    <button
      {...rest}
      className={cn(
        "press rounded-xl border-2 px-3 py-[8px] text-[12.5px] font-bold disabled:opacity-60",
        TONES[tone],
        className,
      )}
    />
  );
}

/**
 * A form bound to a server action, with its own message slot. Used for the many
 * small console forms so none of them has to repeat the plumbing.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  tone = "primary",
  className,
  hidden,
  onDone,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  submitLabel: string;
  tone?: keyof typeof TONES;
  className?: string;
  hidden?: Record<string, string>;
  onDone?: () => void;
}) {
  const [state, submit, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const next = await action(prev, formData);
      if (!next.error) onDone?.();
      return next;
    },
    {},
  );

  return (
    <form action={submit} className={cn("flex flex-col gap-3", className)}>
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <div className="flex items-center gap-3">
        <SmallButton type="submit" tone={tone} disabled={pending}>
          {submitLabel}
        </SmallButton>
        <div className="flex-1">
          <Message state={state} />
        </div>
      </div>
    </form>
  );
}

/** Fire-and-forget button for the void-returning toggle actions. */
export function ToggleButton({
  onRun,
  label,
  tone = "secondary",
  confirm,
}: {
  onRun: () => Promise<void>;
  label: string;
  tone?: keyof typeof TONES;
  confirm?: string;
}) {
  return (
    <SmallButton
      tone={tone}
      onClick={async () => {
        if (confirm && !window.confirm(confirm)) return;
        await onRun();
      }}
    >
      {label}
    </SmallButton>
  );
}
