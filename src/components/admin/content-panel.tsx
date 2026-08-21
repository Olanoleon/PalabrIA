"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createArea,
  reorderArea,
  reorderUnit,
  setAreaVisible,
  setUnitVisible,
} from "@/lib/actions/admin";
import { Panel, Tag, Empty } from "@/components/admin/pieces";
import { ActionForm, Field, SmallButton } from "@/components/admin/form-bits";
import type { ContentArea } from "@/lib/admin-data";
import { cn } from "@/lib/cn";

const DIFFICULTY_LABEL: Record<string, string> = {
  VERY_EASY: "muy fácil",
  EASY: "fácil",
  MEDIUM: "media",
  HARD: "difícil",
};

/**
 * The area list. Visibility is the headline control because it is reversible —
 * hiding preserves learner progress, XP and the content itself.
 */
export function ContentPanel({
  areas,
  base,
}: {
  areas: ContentArea[];
  base: "/admin" | "/super";
}) {
  const [creating, setCreating] = useState(false);

  return (
    <Panel
      title="Áreas de vocabulario"
      description="Ocultar nunca borra: el progreso, el XP y el contenido se conservan."
      actions={
        <SmallButton tone="primary" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cerrar" : "Crear área"}
        </SmallButton>
      }
    >
      {creating ? (
        <div className="mb-5 rounded-2xl border-2 border-dashed border-ink bg-cream p-4">
          <ActionForm action={createArea} submitLabel="Crear y añadir unidades">
            <Field
              label="Nombre del área"
              name="name"
              required
              minLength={2}
              placeholder="Work & Business"
              hint="La IA escribe la descripción y elige el icono al crearla."
            />
            <label className="flex items-center gap-2 text-[12.5px] font-semibold">
              <input type="checkbox" name="visible" className="size-4 accent-[#EA580C]" />
              Visible para los aprendices desde el inicio
            </label>
          </ActionForm>
        </div>
      ) : null}

      {areas.length === 0 ? (
        <Empty>Aún no hay áreas. Crea la primera para empezar.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {areas.map((area, index) => (
            <div
              key={area.id}
              className={cn(
                "rounded-2xl border-2 p-4",
                area.isVisible
                  ? "border-ink bg-surface flat-1"
                  : "border-dashed border-muted-line bg-locked",
              )}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-[17px] font-semibold tracking-[-0.02em]">
                      {area.name}
                    </h3>
                    <Tag tone={area.isVisible ? "pass" : "neutral"}>
                      {area.isVisible ? "visible" : "oculta"}
                    </Tag>
                    {area.fromTemplate ? <Tag>de plantilla</Tag> : null}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-2">{area.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SmallButton
                    disabled={index === 0}
                    onClick={() => reorderArea(area.id, "up")}
                    aria-label="Subir área"
                  >
                    ↑
                  </SmallButton>
                  <SmallButton
                    disabled={index === areas.length - 1}
                    onClick={() => reorderArea(area.id, "down")}
                    aria-label="Bajar área"
                  >
                    ↓
                  </SmallButton>
                  <SmallButton
                    tone={area.isVisible ? "secondary" : "soft"}
                    onClick={() => setAreaVisible(area.id, !area.isVisible)}
                  >
                    {area.isVisible ? "Ocultar" : "Mostrar"}
                  </SmallButton>
                  <Link
                    href={`${base}/content/${area.id}`}
                    className="press rounded-xl border-2 border-ink bg-brand px-3 py-[8px] text-[12.5px] font-bold text-brand-ink hard-1"
                  >
                    Unidades ({area.units.length})
                  </Link>
                </div>
              </div>

              {area.units.length ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-rule pt-3">
                  {area.units.map((unit, unitIndex) => (
                    <li
                      key={unit.id}
                      className="flex flex-wrap items-center gap-2 text-[12.5px]"
                    >
                      <span className="w-6 text-muted">{unitIndex + 1}</span>
                      <Link
                        href={`${base}/unit/${unit.id}`}
                        className="font-semibold underline decoration-brand-mid underline-offset-2"
                      >
                        {unit.name}
                      </Link>
                      <Tag>{DIFFICULTY_LABEL[unit.difficulty] ?? unit.difficulty}</Tag>
                      <span className="text-muted-2">
                        {unit.wordCount} palabras · {unit.activityCount} actividades
                      </span>
                      {unit.generated ? <Tag tone="brand">IA</Tag> : null}
                      <Tag tone={unit.isVisible ? "pass" : "neutral"}>
                        {unit.isVisible ? "visible" : "oculta"}
                      </Tag>
                      <span className="ml-auto flex gap-2">
                        <SmallButton
                          disabled={unitIndex === 0}
                          onClick={() => reorderUnit(unit.id, "up")}
                          aria-label="Subir unidad"
                        >
                          ↑
                        </SmallButton>
                        <SmallButton
                          disabled={unitIndex === area.units.length - 1}
                          onClick={() => reorderUnit(unit.id, "down")}
                          aria-label="Bajar unidad"
                        >
                          ↓
                        </SmallButton>
                        <SmallButton
                          tone={unit.isVisible ? "secondary" : "soft"}
                          onClick={() => setUnitVisible(unit.id, !unit.isVisible)}
                        >
                          {unit.isVisible ? "Ocultar" : "Mostrar"}
                        </SmallButton>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 border-t border-rule pt-3 text-[12.5px] text-muted-2">
                  Sin unidades todavía.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
