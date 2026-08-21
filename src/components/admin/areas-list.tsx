"use client";

import Link from "next/link";
import { useState } from "react";
import { createArea, reorderArea, setAreaVisible } from "@/lib/actions/admin";
import { Panel, Tag, Empty } from "@/components/admin/pieces";
import { ActionForm, Field, SmallButton } from "@/components/admin/form-bits";
import { ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { ContentArea } from "@/lib/admin-data";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

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
  lang,
}: {
  areas: ContentArea[];
  base: "/admin" | "/super";
  lang: Lang;
}) {
  const d = adminT(lang);
  const [creating, setCreating] = useState(false);
  const visibleCount = areas.filter((a) => a.isVisible).length;

  return (
    <Panel
      title={d.areasTitle}
      description={
        areas.length ? d.areasCount(areas.length, visibleCount) : undefined
      }
      actions={
        <SmallButton tone="primary" onClick={() => setCreating((v) => !v)}>
          {creating ? d.close : d.areaCreate}
        </SmallButton>
      }
    >
      {creating ? (
        <div className="mb-5 rounded-2xl border-2 border-dashed border-ink bg-cream p-4">
          <ActionForm action={createArea} submitLabel={d.areaCreateSubmit}>
            <Field
              label={d.areaNameLabel}
              name="name"
              required
              minLength={2}
              placeholder="Work & Business"
              hint={d.areaNameHint}
            />
            <label className="flex items-center gap-2 text-[12.5px] font-semibold">
              <input type="checkbox" name="visible" className="size-4 accent-[#EA580C]" />
              {d.areaVisibleFromStart}
            </label>
          </ActionForm>
        </div>
      ) : null}

      {areas.length === 0 ? (
        <Empty>{d.areasEmpty}</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {areas.map((area, index) => (
            <li
              key={area.id}
              className={cn(
                "flex items-center gap-4 rounded-2xl border-2 p-3 sm:p-4",
                area.isVisible
                  ? "border-ink bg-surface flat-1"
                  : "border-dashed border-muted-line bg-hidden",
              )}
            >
              {/* Reorder: deliberately quiet, and a fixed column so it cannot
                  be pushed around by the text beside it. */}
              <div className="flex flex-none flex-col gap-1">
                <SmallButton
                  tone="quiet"
                  disabled={index === 0}
                  onClick={() => reorderArea(area.id, "up")}
                  aria-label={`${d.moveUp}: ${area.name}`}
                  className="px-2 py-[2px] leading-none"
                >
                  ↑
                </SmallButton>
                <SmallButton
                  tone="quiet"
                  disabled={index === areas.length - 1}
                  onClick={() => reorderArea(area.id, "down")}
                  aria-label={`${d.moveDown}: ${area.name}`}
                  className="px-2 py-[2px] leading-none"
                >
                  ↓
                </SmallButton>
              </div>

              {/* min-w-0 is what stops a long description from shoving the
                  actions off to the right. */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={cn(
                      "font-display text-[16px] font-semibold tracking-[-0.02em]",
                      !area.isVisible && "text-hidden-ink",
                    )}
                  >
                    {area.name}
                  </h3>
                  <Tag tone={area.isVisible ? "pass" : "neutral"}>
                    {area.isVisible ? d.tagVisible : d.tagHidden}
                  </Tag>
                  {area.fromTemplate ? <Tag>{d.tagFromTemplate}</Tag> : null}
                </div>
                <p className="mt-[2px] truncate text-[12.5px] text-muted-2">
                  {area.description}
                </p>
                <p className="mt-[2px] text-[11.5px] text-muted">
                  {d.unitsOfArea(
                    area.units.length,
                    area.units.filter((u) => u.isVisible).length,
                  )}
                </p>
              </div>

              <div className="flex flex-none items-center gap-2">
                <SmallButton
                  tone={area.isVisible ? "secondary" : "soft"}
                  onClick={() => {
                    // Hiding removes content from every learner at once, so it
                    // asks first. Showing it again does not need to.
                    if (
                      area.isVisible &&
                      !window.confirm(d.hideAreaConfirm(area.name))
                    ) {
                      return;
                    }
                    setAreaVisible(area.id, !area.isVisible);
                  }}
                >
                  {area.isVisible ? d.hide : d.show}
                </SmallButton>
                <Link
                  href={`${base}/content/${area.id}`}
                  className="press inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-brand px-3 py-[8px] text-[12.5px] font-bold text-brand-ink hard-1"
                >
                  {d.open}
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
