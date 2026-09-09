"use client";

import { useState } from "react";
import { CopyIcon } from "@/components/ui/icons";
import { SmallButton } from "@/components/admin/form-bits";
import { regenerateJoinCode } from "@/lib/actions/super";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

/**
 * An organisation's join code and invite link.
 *
 * Two ways to hand out the same thing: the four digits, for reading out on a
 * call, and the link, for pasting into a message. Regenerating replaces the
 * code, which silently revokes every copy already circulating — hence the
 * confirm.
 *
 * The clipboard-with-fallback is the same shape as `learner/copy-key.tsx`, but
 * written against the console's smaller kit rather than imported: the two UI
 * kits are deliberately separate and nothing else crosses that line.
 */
export function JoinLink({
  orgId,
  code,
  appUrl,
  lang,
}: {
  orgId: string;
  code: string | null;
  appUrl: string;
  lang: Lang;
}) {
  const d = adminT(lang);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  if (!code) {
    return <p className="text-[12.5px] text-muted-2">{d.joinNoCode}</p>;
  }

  const url = `${appUrl}/join/${code}`;

  const copy = async (value: string, which: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be blocked; both values are shown in full either way.
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
          {d.joinCodeLabel}
        </span>
        <span className="rounded-lg border-2 border-ink bg-cream px-[10px] py-[3px] font-mono text-[16px] font-bold tracking-[0.14em]">
          {code}
        </span>
        <SmallButton onClick={() => copy(code, "code")}>
          <span className="flex items-center gap-[5px]">
            <CopyIcon size={13} />
            {copied === "code" ? d.joinCopied : d.joinCopyCode}
          </span>
        </SmallButton>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-lg border-[1.5px] border-dashed border-muted-line bg-locked px-[10px] py-[5px] font-mono text-[11.5px] text-muted-2">
          {url}
        </span>
        <SmallButton onClick={() => copy(url, "link")}>
          <span className="flex items-center gap-[5px]">
            <CopyIcon size={13} />
            {copied === "link" ? d.joinCopied : d.joinCopyLink}
          </span>
        </SmallButton>
      </div>

      <div className="flex items-center gap-3">
        <SmallButton
          tone="secondary"
          onClick={() => {
            if (confirm(d.joinRegenerateConfirm)) void regenerateJoinCode(orgId);
          }}
        >
          {d.joinRegenerate}
        </SmallButton>
        <p className="flex-1 text-[11.5px] text-muted-2">{d.joinNote}</p>
      </div>
    </div>
  );
}
