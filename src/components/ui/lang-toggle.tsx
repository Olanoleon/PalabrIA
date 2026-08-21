"use client";

import { useTransition } from "react";
import { setLanguage } from "@/lib/actions/language";
import { cn } from "@/lib/cn";
import type { Lang } from "@/lib/i18n";

/** The ES/EN pill from the design header. */
export function LangToggle({ lang }: { lang: Lang }) {
  const [pending, start] = useTransition();
  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-full border-[1.5px] border-ink",
        pending && "opacity-70",
      )}
    >
      {(["es", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => start(() => setLanguage(code))}
          className={cn(
            "px-2 py-[5px] text-[11px] font-bold",
            lang === code ? "bg-brand text-white" : "bg-transparent text-muted",
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
