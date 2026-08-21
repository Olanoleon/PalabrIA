"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/actions/auth";
import { SignOutIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

export function SignOutButton({ lang }: { lang: Lang }) {
  const [pending, start] = useTransition();
  const d = t(lang);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => signOut())}
      className="press flex items-center justify-center gap-[9px] rounded-2xl border-2 border-ink bg-surface py-[14px] text-[14px] font-bold text-brand-deep hard-2 disabled:opacity-60"
    >
      <SignOutIcon size={18} />
      {d.signOut}
    </button>
  );
}
