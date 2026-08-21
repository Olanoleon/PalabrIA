"use client";

import Link from "next/link";
import { useState } from "react";
import {
  renameArea,
  reorderUnit,
  setAreaVisible,
  setUnitVisible,
} from "@/lib/actions/admin";
import { Panel, Tag, Empty } from "@/components/admin/pieces";
import {
  ActionForm,
  Field,
  SmallButton,
  TextArea,
} from "@/components/admin/form-bits";
import { GenerateUnitLink } from "@/components/admin/generate-unit-link";
import { cn } from "@/lib/cn";
import type { ContentArea } from "@/lib/admin-data";

const DIFFICULTY_LABEL: Record<string, string> = {
  VERY_EASY: "muy fácil",
  EASY: "fácil",
  MEDIUM: "media",
  HARD: "difícil",
};

/**
 * Screen two: one area and the units inside it.
 *
 * Distinct from the areas list on purpose — a header describing *this* area,
 * then a Unidades section. AI generation lives here and only here: a unit is
 * always generated into a specific area, so the button belongs beside that
 * area's unit list rather than in the console's navigation.
 */
export function AreaDetail({
  area,
  base,
}: {
  area: ContentArea;
  base: "/admin" | "/super";
}) {
  const [editing, setEditing] = useState(false);
  const visibleUnits = area.units.filter((u) => u.isVisible).length;
  const totalWords = area.units.reduce((n, u) => n + u.wordCount, 0);

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[24px] font-semibold tracking-[-0.03em]">
                {area.name}
              </h1>
              <Tag tone={area.isVisible ? "pass" : "neutral"}>
                {area.isVisible ? "visible" : "oculta"}
              </Tag>
              {area.fromTemplate ? <Tag>de plantilla</Tag> : null}
            </div>
            <p className="mt-1 max-w-[60ch] text-[13px] leading-[1.5] text-body">
              {area.description}
            </p>
            <p className="mt-1 text-[12px] text-muted">
              {area.units.length} unidad(es) · {visibleUnits} visible(s) ·{" "}
              {totalWords} palabras
            </p>
          </div>

          <div className="flex flex-none flex-wrap items-center gap-2">
            <SmallButton onClick={() => setEditing((v) => !v)}>
              {editing ? "Cerrar" : "Editar área"}
            </SmallButton>
            <SmallButton
              tone={area.isVisible ? "secondary" : "soft"}
              onClick={() => setAreaVisible(area.id, !area.isVisible)}
            >
              {area.isVisible ? "Ocultar área" : "Mostrar área"}
            </SmallButton>
          </div>
        </div>

        {!area.isVisible ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-ink bg-cream px-3 py-2 text-[12.5px] text-body">
            Esta área está oculta: sus unidades no aparecen en la ruta de los
            aprendices. El progreso y el XP se conservan.
          </p>
        ) : null}

        {editing ? (
          <div className="mt-4 border-t border-rule pt-4">
            <ActionForm
              action={renameArea}
              submitLabel="Guardar área"
              hidden={{ areaId: area.id }}
              onDone={() => setEditing(false)}
            >
              <Field label="Nombre" name="name" defaultValue={area.name} required />
              <TextArea
                label="Descripción"
                name="description"
                defaultValue={area.description}
                hint="Es lo que el aprendiz ve bajo el nombre del área."
              />
            </ActionForm>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Unidades"
        description="Ocultar nunca borra: el progreso, el XP y el contenido se conservan."
        actions={<GenerateUnitLink areaId={area.id} base={base} />}
      >
        {area.units.length === 0 ? (
          <Empty>
            Esta área no tiene unidades todavía. Genera la primera con IA.
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {area.units.map((unit, index) => (
              <li
                key={unit.id}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border-2 p-3",
                  unit.isVisible
                    ? "border-ink bg-surface flat-1"
                    : "border-dashed border-muted-line bg-locked",
                )}
              >
                <span className="w-5 flex-none text-center font-display text-[15px] font-bold text-muted">
                  {index + 1}
                </span>

                <div className="flex flex-none flex-col gap-1">
                  <SmallButton
                    tone="quiet"
                    disabled={index === 0}
                    onClick={() => reorderUnit(unit.id, "up")}
                    aria-label={`Subir ${unit.name}`}
                    className="px-2 py-[2px] leading-none"
                  >
                    ↑
                  </SmallButton>
                  <SmallButton
                    tone="quiet"
                    disabled={index === area.units.length - 1}
                    onClick={() => reorderUnit(unit.id, "down")}
                    aria-label={`Bajar ${unit.name}`}
                    className="px-2 py-[2px] leading-none"
                  >
                    ↓
                  </SmallButton>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{unit.name}</span>
                    <Tag tone={unit.isVisible ? "pass" : "neutral"}>
                      {unit.isVisible ? "visible" : "oculta"}
                    </Tag>
                    {unit.generated ? <Tag tone="brand">IA</Tag> : null}
                  </div>
                  <p className="mt-[2px] text-[11.5px] text-muted">
                    {DIFFICULTY_LABEL[unit.difficulty] ?? unit.difficulty} ·{" "}
                    {unit.wordCount} palabras · {unit.activityCount} actividades
                  </p>
                </div>

                <div className="flex flex-none items-center gap-2">
                  <SmallButton
                    tone={unit.isVisible ? "secondary" : "soft"}
                    onClick={() => setUnitVisible(unit.id, !unit.isVisible)}
                  >
                    {unit.isVisible ? "Ocultar" : "Mostrar"}
                  </SmallButton>
                  <Link
                    href={`${base}/unit/${unit.id}`}
                    className="press rounded-xl border-2 border-ink bg-surface px-3 py-[8px] text-[12.5px] font-bold hard-1"
                  >
                    Editar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
