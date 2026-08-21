"use client";

import { useState } from "react";
import { CopyIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/** Bre-B keys are typed into a bank app by hand, so copying matters. */
export function CopyKey({ value, lang }: { value: string; lang: Lang }) {
  const d = t(lang);
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard can be blocked; the key is shown in full either way.
        }
      }}
      className="press flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-ink bg-cream px-[14px] py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
          {d.payKeyLabel}
        </span>
        <span className="block truncate font-mono text-[16px] font-medium">
          {value}
        </span>
      </span>
      <span className="flex flex-none items-center gap-[6px] rounded-full border-[1.5px] border-ink bg-brand-soft px-[10px] py-1 text-[10.5px] font-bold">
        <CopyIcon size={14} />
        {copied ? d.payKeyCopied : d.payKeyCopy}
      </span>
    </button>
  );
}
