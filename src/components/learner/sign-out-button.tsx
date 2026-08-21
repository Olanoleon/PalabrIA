"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/actions/auth";
import { SignOutIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export function SignOutButton({
  lang,
  className,
}: {
  lang: Lang;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const d = t(lang);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => signOut())}
      className={cn(
        // whitespace-nowrap: "Cerrar sesión" is long enough to wrap and clip
        // inside a constrained container, which it did in the console header.
        "press flex items-center justify-center gap-[9px] whitespace-nowrap rounded-2xl border-2 border-ink bg-surface py-[14px] text-[14px] font-bold text-brand-deep hard-2 disabled:opacity-60",
        className,
      )}
    >
      <SignOutIcon size={18} />
      {d.signOut}
    </button>
  );
}
