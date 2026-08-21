"use client";

import Link from "next/link";
import { useState } from "react";
import { createArea, reorderArea, setAreaVisible } from "@/lib/actions/admin";
import { Panel, Tag, Empty } from "@/components/admin/pieces";
import { ActionForm, Field, SmallButton } from "@/components/admin/form-bits";
import { ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { ContentArea } from "@/lib/admin-data";

/**
 * Screen one: the areas of a curriculum, and nothing else.
 *
 * Units deliberately do not appear here. Listing them inline made this screen a
 * duplicate of the area screen, and made "where am I" unanswerable. Opening an
 * area is the single primary action per row.
 */
export function AreasList({
  areas,
  base,
}: {
  areas: ContentArea[];
  base: "/admin" | "/super";
}) {
  const [creating, setCreating] = useState(false);
  const visibleCount = areas.filter((a) => a.isVisible).length;

  return (
    <Panel
      title="Áreas de vocabulario"
      description={
        areas.length
          ? `${areas.length} en total · ${visibleCount} visible(s) para los aprendices`
          : undefined
      }
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
        <ul className="flex flex-col gap-2">
          {areas.map((area, index) => (
            <li
              key={area.id}
              className={cn(
                "flex items-center gap-4 rounded-2xl border-2 p-3 sm:p-4",
                area.isVisible
                  ? "border-ink bg-surface flat-1"
                  : "border-dashed border-muted-line bg-locked",
              )}
            >
              {/* Reorder: deliberately quiet, and a fixed column so it cannot
                  be pushed around by the text beside it. */}
              <div className="flex flex-none flex-col gap-1">
                <SmallButton
                  tone="quiet"
                  disabled={index === 0}
                  onClick={() => reorderArea(area.id, "up")}
                  aria-label={`Subir ${area.name}`}
                  className="px-2 py-[2px] leading-none"
                >
                  ↑
                </SmallButton>
                <SmallButton
                  tone="quiet"
                  disabled={index === areas.length - 1}
                  onClick={() => reorderArea(area.id, "down")}
                  aria-label={`Bajar ${area.name}`}
                  className="px-2 py-[2px] leading-none"
                >
                  ↓
                </SmallButton>
              </div>

              {/* min-w-0 is what stops a long description from shoving the
                  actions off to the right. */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-[16px] font-semibold tracking-[-0.02em]">
                    {area.name}
                  </h3>
                  <Tag tone={area.isVisible ? "pass" : "neutral"}>
                    {area.isVisible ? "visible" : "oculta"}
                  </Tag>
                  {area.fromTemplate ? <Tag>de plantilla</Tag> : null}
                </div>
                <p className="mt-[2px] truncate text-[12.5px] text-muted-2">
                  {area.description}
                </p>
                <p className="mt-[2px] text-[11.5px] text-muted">
                  {area.units.length} unidad(es) ·{" "}
                  {area.units.filter((u) => u.isVisible).length} visible(s)
                </p>
              </div>

              <div className="flex flex-none items-center gap-2">
                <SmallButton
                  tone={area.isVisible ? "secondary" : "soft"}
                  onClick={() => setAreaVisible(area.id, !area.isVisible)}
                >
                  {area.isVisible ? "Ocultar" : "Mostrar"}
                </SmallButton>
                <Link
                  href={`${base}/content/${area.id}`}
                  className="press inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-brand px-3 py-[8px] text-[12.5px] font-bold text-brand-ink hard-1"
                >
                  Abrir
                  <ChevronRight size={11} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
