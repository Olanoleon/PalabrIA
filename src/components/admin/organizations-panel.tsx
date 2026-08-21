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
}: {
  organizations: OrgRow[];
  activeOrgId: string | null;
}) {
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Panel
      title="Organizaciones"
      description="Al crear una, la plantilla global se replica como copia independiente (oculta)."
      actions={
        <SmallButton tone="primary" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cerrar" : "Crear organización"}
        </SmallButton>
      }
    >
      {creating ? (
        <div className="mb-5 rounded-2xl border-2 border-dashed border-ink bg-cream p-4">
          <ActionForm
            action={createOrganization}
            submitLabel="Crear y replicar plantilla"
            onDone={() => setCreating(false)}
          >
            <Field
              label="Nombre"
              name="name"
              required
              minLength={2}
              placeholder="CAMIL Institute Medellín"
            />
          </ActionForm>
        </div>
      ) : null}

      {organizations.length === 0 ? (
        <Empty>Todavía no hay organizaciones.</Empty>
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
                      {org.isActive ? "activa" : "inactiva"}
                    </Tag>
                    {activeOrgId === org.id ? (
                      <Tag tone="brand">en Organization Mode</Tag>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-2">
                    {org._count.learners} aprendices · {org._count.areas} áreas ·{" "}
                    {org.users.length} administradores
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SmallButton
                    tone="primary"
                    onClick={() => enterOrganizationMode(org.id)}
                  >
                    Entrar al contenido
                  </SmallButton>
                  <SmallButton
                    tone={org.isActive ? "secondary" : "soft"}
                    onClick={() => setOrganizationActive(org.id, !org.isActive)}
                  >
                    {org.isActive ? "Desactivar" : "Reactivar"}
                  </SmallButton>
                  <SmallButton onClick={() => setOpen(open === org.id ? null : org.id)}>
                    {open === org.id ? "Cerrar" : "Administrar"}
                  </SmallButton>
                </div>
              </div>

              {open === org.id ? (
                <div className="mt-4 flex flex-col gap-4 border-t border-rule pt-4">
                  <ActionForm
                    action={renameOrganization}
                    submitLabel="Renombrar"
                    tone="soft"
                    hidden={{ orgId: org.id }}
                  >
                    <Field label="Nombre" name="name" defaultValue={org.name} />
                  </ActionForm>

                  <div>
                    <h4 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
                      Administradores
                    </h4>
                    {org.users.length === 0 ? (
                      <p className="text-[12.5px] text-muted-2">
                        Sin administradores todavía.
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
                            {!admin.isActive ? <Tag tone="danger">inactivo</Tag> : null}
                            <span className="ml-auto flex gap-2">
                              <SmallButton
                                tone={admin.isActive ? "secondary" : "soft"}
                                onClick={() => setUserActive(admin.id, !admin.isActive)}
                              >
                                {admin.isActive ? "Desactivar" : "Reactivar"}
                              </SmallButton>
                              <SmallButton
                                tone="danger"
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      `¿Eliminar la cuenta de ${admin.name}?`,
                                    )
                                  ) {
                                    return;
                                  }
                                  await deleteOrgAdmin(admin.id);
                                }}
                              >
                                Eliminar
                              </SmallButton>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <ActionForm
                      action={createOrgAdmin}
                      submitLabel="Crear administrador"
                      tone="soft"
                      hidden={{ orgId: org.id }}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Nombre" name="name" required minLength={2} />
                        <Field label="Correo" name="email" type="email" required />
                      </div>
                    </ActionForm>
                  </div>

                  <div className="rounded-2xl border-2 border-ink bg-cream p-3">
                    <p className="mb-2 text-[12.5px] text-body">
                      Eliminar la organización borra sus aprendices, su contenido y su
                      progreso. Escribe <strong>{org.name}</strong> para confirmar.
                    </p>
                    <ActionForm
                      action={deleteOrganization}
                      submitLabel="Eliminar organización"
                      tone="danger"
                      hidden={{ orgId: org.id }}
                    >
                      <Field label="Confirmación" name="confirm" required />
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
