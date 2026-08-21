"use client";

import { useState } from "react";
import {
  inviteLearner,
  overrideLearnerStatus,
  setLearnerActive,
  updateLearner,
} from "@/lib/actions/admin";
import { Panel, Tag, Td, Th, TableScroll, Empty } from "@/components/admin/pieces";
import { ActionForm, Field, Select, SmallButton, TextArea } from "@/components/admin/form-bits";
import type { LearnerRow } from "@/lib/admin-data";
import { formatDate, type Lang } from "@/lib/i18n";

const STATUS_TONE: Record<string, "pass" | "warn" | "danger" | "neutral" | "brand"> = {
  ACTIVE: "pass",
  TRIAL: "brand",
  PAST_DUE: "warn",
  SUSPENDED: "danger",
  OVERRIDE_ACTIVE: "brand",
  DISABLED: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "al día",
  TRIAL: "prueba",
  PAST_DUE: "vencido",
  SUSPENDED: "suspendido",
  OVERRIDE_ACTIVE: "forzado activo",
  DISABLED: "desactivado",
};

export function LearnersPanel({
  learners,
  lang,
  organizations,
}: {
  learners: LearnerRow[];
  lang: Lang;
  /** Only the Super Admin gets a picker; an Org Admin is pinned to their own. */
  organizations?: Array<{ id: string; name: string }>;
}) {
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <Panel
        title="Aprendices"
        description={`${learners.length} en total · ${learners.filter((l) => l.hasAccess && l.isActive).length} con acceso`}
        actions={
          <SmallButton tone="primary" onClick={() => setInviting((v) => !v)}>
            {inviting ? "Cerrar" : "Invitar aprendiz"}
          </SmallButton>
        }
      >
        {inviting ? (
          <div className="mb-5 rounded-2xl border-2 border-dashed border-ink bg-cream p-4">
            <ActionForm
              action={inviteLearner}
              submitLabel="Crear cuenta"
              onDone={() => setInviting(false)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" name="name" required minLength={2} />
                <Field label="Correo" name="email" type="email" required />
                <Field label="Equipo (opcional)" name="team" />
                {organizations ? (
                  <Select label="Organización" name="orgId" required>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </Select>
                ) : null}
              </div>
              <p className="text-[11.5px] text-muted-2">
                La contraseña inicial es su propio correo y tendrá que cambiarla al
                entrar. El primer mes queda como periodo de prueba.
              </p>
            </ActionForm>
          </div>
        ) : null}

        {learners.length === 0 ? (
          <Empty>Todavía no hay aprendices en esta organización.</Empty>
        ) : (
          <TableScroll>
            <thead>
              <tr>
                <Th>Aprendiz</Th>
                <Th>Progreso</Th>
                <Th>Actividad</Th>
                <Th>Pago</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner) => (
                <tr key={learner.id}>
                  <Td>
                    <div className="font-semibold">{learner.name}</div>
                    <div className="text-[11.5px] text-muted-2">{learner.email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {learner.team ? <Tag>{learner.team}</Tag> : null}
                      {!learner.isActive ? <Tag tone="danger">cuenta inactiva</Tag> : null}
                      {learner.mustChangePassword ? <Tag tone="warn">sin entrar</Tag> : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="font-semibold">Nivel {learner.level}</div>
                    <div className="text-[11.5px] text-muted-2">
                      {learner.xp} XP · {learner.unitsPassed} unidades · racha{" "}
                      {learner.streak}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-[12px] text-muted-2">
                      {learner.lastActiveAt
                        ? formatDate(learner.lastActiveAt, lang)
                        : "nunca"}
                    </div>
                  </Td>
                  <Td>
                    <Tag tone={STATUS_TONE[learner.effectiveStatus] ?? "neutral"}>
                      {STATUS_LABEL[learner.effectiveStatus] ?? learner.effectiveStatus}
                    </Tag>
                    <div className="mt-1 text-[11px] text-muted-2">
                      {learner.paidThrough
                        ? `hasta ${formatDate(learner.paidThrough, lang)}`
                        : "sin periodo"}
                    </div>
                    {learner.overrideNote ? (
                      <div className="mt-1 text-[11px] italic text-muted-2">
                        {learner.overrideNote}
                      </div>
                    ) : null}
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <SmallButton
                        onClick={() =>
                          setEditing(editing === learner.id ? null : learner.id)
                        }
                      >
                        {editing === learner.id ? "Cerrar" : "Editar"}
                      </SmallButton>
                      <SmallButton
                        tone={learner.isActive ? "danger" : "soft"}
                        onClick={() => setLearnerActive(learner.id, !learner.isActive)}
                      >
                        {learner.isActive ? "Desactivar" : "Reactivar"}
                      </SmallButton>
                    </div>
                    {editing === learner.id ? (
                      <div className="mt-3 flex flex-col gap-4 rounded-2xl border-2 border-ink bg-cream p-3 text-left">
                        <ActionForm
                          action={updateLearner}
                          submitLabel="Guardar datos"
                          hidden={{ learnerId: learner.id }}
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Nombre" name="name" defaultValue={learner.name} />
                            <Field
                              label="Equipo"
                              name="team"
                              defaultValue={learner.team ?? ""}
                            />
                          </div>
                        </ActionForm>

                        <div className="h-px bg-rule" />

                        <ActionForm
                          action={overrideLearnerStatus}
                          submitLabel="Aplicar estado"
                          tone="soft"
                          hidden={{ learnerId: learner.id }}
                        >
                          <Select
                            label="Estado manual"
                            name="status"
                            defaultValue={
                              learner.billingStatus === "OVERRIDE_ACTIVE" ||
                              learner.billingStatus === "DISABLED"
                                ? learner.billingStatus
                                : "AUTO"
                            }
                          >
                            <option value="AUTO">Automático (según el pago)</option>
                            <option value="OVERRIDE_ACTIVE">
                              Acceso forzado (ignora el pago)
                            </option>
                            <option value="DISABLED">Desactivado por admin</option>
                          </Select>
                          <TextArea
                            label="Motivo"
                            name="note"
                            required
                            placeholder="Beca interna, acuerdo de pago, baja administrativa…"
                          />
                        </ActionForm>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        )}
      </Panel>
    </>
  );
}
