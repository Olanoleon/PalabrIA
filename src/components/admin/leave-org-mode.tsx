"use client";

import { leaveOrganizationMode } from "@/lib/actions/super";
import { SmallButton } from "@/components/admin/form-bits";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

export function LeaveOrgMode({ lang }: { lang: Lang }) {
  return (
    <SmallButton tone="soft" onClick={() => leaveOrganizationMode()}>
      {adminT(lang).orgModeLeave}
    </SmallButton>
  );
}
