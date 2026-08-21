"use client";

import { useState } from "react";
import {
  createOrgAdmin,
  createOrganization,
  deleteOrgAdmin,
  deleteOrganization,
  enterOrganizationMode,
  renameOrganization,
  setOrganizationActive,
  setUserActive,
} from "@/lib/actions/super";
import { Panel, Tag, Empty } from "@/components/admin/pieces";
import { ActionForm, Field, SmallButton } from "@/components/admin/form-bits";
import { cn } from "@/lib/cn";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count: { learners: number; areas: number };
  users: Array<{ id: string; name: string; email: string; isActive: boolean }>;
};

export function OrganizationsPanel({
  organizations,
  activeOrgId,
  lang,
}: {
  organizations: OrgRow[];
  activeOrgId: string | null;
  lang: Lang;
}) {
  const d = adminT(lang);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Panel
      title={d.orgsTitle}
      description={d.orgsNote}
      actions={
        <SmallButton tone="primary" onClick={() => setCreating((v) => !v)}>
          {creating ? d.close : d.orgCreate}
        </SmallButton>
      }
    >
      {creating ? (
        <div className="mb-5 rounded-2xl border-2 border-dashed border-ink bg-cream p-4">
          <ActionForm
            action={createOrganization}
            submitLabel={d.orgCreateSubmit}
            onDone={() => setCreating(false)}
          >
            <Field
              label={d.name}
              name="name"
              required
              minLength={2}
              placeholder="CAMIL Institute Medellín"
            />
          </ActionForm>
        </div>
      ) : null}

      {organizations.length === 0 ? (
        <Empty>{d.orgsEmpty}</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {organizations.map((org) => (
            <div
              key={org.id}
              className={cn(
                "rounded-2xl border-2 p-4",
                org.isActive
                  ? "border-ink bg-surface flat-1"
                  : "border-dashed border-muted-line bg-locked",
              )}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-[17px] font-semibold tracking-[-0.02em]">
                      {org.name}
                    </h3>
                    <Tag tone={org.isActive ? "pass" : "neutral"}>
                      {org.isActive ? d.orgActive : d.orgInactive}
                    </Tag>
                    {activeOrgId === org.id ? (
                      <Tag tone="brand">{d.orgInMode}</Tag>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-2">
                    {d.orgStats(org._count.learners, org._count.areas, org.users.length)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SmallButton
                    tone="primary"
                    onClick={() => enterOrganizationMode(org.id)}
                  >
                    {d.orgEnter}
                  </SmallButton>
                  <SmallButton
                    tone={org.isActive ? "secondary" : "soft"}
                    onClick={() => setOrganizationActive(org.id, !org.isActive)}
                  >
                    {org.isActive ? d.deactivate : d.reactivate}
                  </SmallButton>
                  <SmallButton onClick={() => setOpen(open === org.id ? null : org.id)}>
                    {open === org.id ? d.close : d.orgManage}
                  </SmallButton>
                </div>
              </div>

              {open === org.id ? (
                <div className="mt-4 flex flex-col gap-4 border-t border-rule pt-4">
                  <ActionForm
                    action={renameOrganization}
                    submitLabel={d.orgRename}
                    tone="soft"
                    hidden={{ orgId: org.id }}
                  >
                    <Field label={d.name} name="name" defaultValue={org.name} />
                  </ActionForm>

                  <div>
                    <h4 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
                      {d.orgAdmins}
                    </h4>
                    {org.users.length === 0 ? (
                      <p className="text-[12.5px] text-muted-2">
                        {d.orgNoAdmins}
                      </p>
                    ) : (
                      <ul className="mb-3 flex flex-col gap-2">
                        {org.users.map((admin) => (
                          <li
                            key={admin.id}
                            className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-[12.5px]"
                          >
                            <strong>{admin.name}</strong>
                            <span className="text-muted-2">{admin.email}</span>
                            {!admin.isActive ? <Tag tone="danger">{d.adminInactive}</Tag> : null}
                            <span className="ml-auto flex gap-2">
                              <SmallButton
                                tone={admin.isActive ? "secondary" : "soft"}
                                onClick={() => setUserActive(admin.id, !admin.isActive)}
                              >
                                {admin.isActive ? d.deactivate : d.reactivate}
                              </SmallButton>
                              <SmallButton
                                tone="danger"
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      d.orgAdminDeleteConfirm(admin.name),
                                    )
                                  ) {
                                    return;
                                  }
                                  await deleteOrgAdmin(admin.id);
                                }}
                              >
                                {d.delete}
                              </SmallButton>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <ActionForm
                      action={createOrgAdmin}
                      submitLabel={d.orgAdminCreate}
                      tone="soft"
                      hidden={{ orgId: org.id }}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={d.name} name="name" required minLength={2} />
                        <Field label={d.email} name="email" type="email" required />
                      </div>
                    </ActionForm>
                  </div>

                  <div className="rounded-2xl border-2 border-ink bg-cream p-3">
                    <p className="mb-2 text-[12.5px] text-body">
                      {d.orgDeleteNote(org.name)}
                    </p>
                    <ActionForm
                      action={deleteOrganization}
                      submitLabel={d.orgDelete}
                      tone="danger"
                      hidden={{ orgId: org.id }}
                    >
                      <Field label={d.orgDeleteConfirmLabel} name="confirm" required />
                    </ActionForm>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
