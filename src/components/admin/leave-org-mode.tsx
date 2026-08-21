"use client";

import { leaveOrganizationMode } from "@/lib/actions/super";
import { SmallButton } from "@/components/admin/form-bits";

export function LeaveOrgMode() {
  return (
    <SmallButton tone="soft" onClick={() => leaveOrganizationMode()}>
      Salir a la plantilla global
    </SmallButton>
  );
}
