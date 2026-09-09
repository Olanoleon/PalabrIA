"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { SmallButton } from "@/components/admin/form-bits";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

/**
 * An icon button that asks before it acts.
 *
 * A real dialog rather than `window.confirm`, because the two things it guards
 * — blocking someone's sign-in, and erasing them along with their payment
 * history — deserve a sentence explaining what happens, and the native prompt
 * gives you one line of unstyled text with no room for it.
 */
export function ConfirmAction({
  icon,
  srLabel,
  title,
  body,
  confirmLabel,
  tone = "secondary",
  lang,
  onConfirm,
}: {
  icon: React.ReactNode;
  /** Names the button for anyone not seeing the icon. */
  srLabel: string;
  title: string;
  body: string;
  confirmLabel: string;
  tone?: "secondary" | "danger";
  lang: Lang;
  onConfirm: () => void | Promise<void>;
}) {
  const d = adminT(lang);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus lands on cancel, not confirm: the safe option should be the one a
    // stray Enter picks.
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={srLabel}
        title={srLabel}
        className={cn(
          "press grid size-8 flex-none place-items-center rounded-[10px] border-2 border-ink bg-surface hard-1",
          tone === "danger" ? "text-brand-dark" : "text-ink",
        )}
      >
        {icon}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/55 px-5 [animation:overlay-in_180ms_ease-out]"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[380px] rounded-[20px] border-2 border-ink bg-paper p-5 flat-3"
          >
            <h2 className="font-display text-[17px] font-bold tracking-[-0.02em]">
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-[1.5] text-body-2">{body}</p>
            <div className="mt-4 flex justify-end gap-2">
              <SmallButton
                ref={cancelRef}
                tone="soft"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                {d.cancel}
              </SmallButton>
              <SmallButton
                tone={tone === "danger" ? "primary" : "secondary"}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await onConfirm();
                    setOpen(false);
                  })
                }
              >
                {confirmLabel}
              </SmallButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
