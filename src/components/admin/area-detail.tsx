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
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

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
  lang,
}: {
  area: ContentArea;
  base: "/admin" | "/super";
  lang: Lang;
}) {
  const d = adminT(lang);
  const difficultyLabel: Record<string, string> = {
    VERY_EASY: d.difficultyVeryEasy,
    EASY: d.difficultyEasy,
    MEDIUM: d.difficultyMedium,
    HARD: d.difficultyHard,
  };
  const [editing, setEditing] = useState(false);
  const visibleUnits = area.units.filter((u) => u.isVisible).length;
  const totalWords = area.units.reduce((n, u) => n + u.wordCount, 0);

  return (
    <div className="flex flex-col gap-5">
      <Panel className={cn(!area.isVisible && "border-dashed bg-hidden")}>
        {/* Stacked below sm: side by side, the buttons stole enough width to
            wrap the title and squeeze the description into a ribbon. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[24px] font-semibold tracking-[-0.03em]">
                {area.name}
              </h1>
              <Tag tone={area.isVisible ? "pass" : "neutral"}>
                {area.isVisible ? d.tagVisible : d.tagHidden}
              </Tag>
              {area.fromTemplate ? <Tag>{d.tagFromTemplate}</Tag> : null}
            </div>
            <p className="mt-1 max-w-[60ch] text-[13px] leading-[1.5] text-body">
              {area.description}
            </p>
            <p className="mt-1 text-[12px] text-muted">
              {d.areaStats(area.units.length, visibleUnits, totalWords)}
            </p>
          </div>

          <div className="flex flex-none flex-wrap items-center gap-2">
            <SmallButton onClick={() => setEditing((v) => !v)}>
              {editing ? d.close : d.areaEdit}
            </SmallButton>
            <SmallButton
              tone={area.isVisible ? "secondary" : "soft"}
              onClick={() => {
                if (
                  area.isVisible &&
                  !window.confirm(d.hideAreaConfirm(area.name))
                ) {
                  return;
                }
                setAreaVisible(area.id, !area.isVisible);
              }}
            >
              {area.isVisible ? d.areaHide : d.areaShow}
            </SmallButton>
          </div>
        </div>

        {!area.isVisible ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-ink bg-cream px-3 py-2 text-[12.5px] text-body">
            {d.areaHiddenNote}
          </p>
        ) : null}

        {editing ? (
          <div className="mt-4 border-t border-rule pt-4">
            <ActionForm
              action={renameArea}
              submitLabel={d.areaSave}
              hidden={{ areaId: area.id }}
              onDone={() => setEditing(false)}
            >
              <Field label={d.name} name="name" defaultValue={area.name} required />
              <TextArea
                label={d.description}
                name="description"
                defaultValue={area.description}
                hint={d.areaDescHint}
              />
            </ActionForm>
          </div>
        ) : null}
      </Panel>

      <Panel
        title={d.unitsTitle}
        description={d.unitsNote}
        actions={<GenerateUnitLink areaId={area.id} base={base} lang={lang} />}
      >
        {area.units.length === 0 ? (
          <Empty>{d.unitsEmpty}</Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {area.units.map((unit, index) => (
              <li
                key={unit.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border-2 p-3 sm:flex-row sm:items-center sm:gap-4",
                  unit.isVisible
                    ? "border-ink bg-surface flat-1"
                    : "border-dashed border-muted-line bg-hidden",
                )}
              >
                <span className="hidden w-5 flex-none text-center font-display text-[15px] font-bold text-muted sm:block">
                  {index + 1}
                </span>

                <div className="flex flex-none gap-1 sm:flex-col">
                  <SmallButton
                    tone="quiet"
                    disabled={index === 0}
                    onClick={() => reorderUnit(unit.id, "up")}
                    aria-label={`${d.moveUp}: ${unit.name}`}
                    className="px-2 py-[2px] leading-none"
                  >
                    ↑
                  </SmallButton>
                  <SmallButton
                    tone="quiet"
                    disabled={index === area.units.length - 1}
                    onClick={() => reorderUnit(unit.id, "down")}
                    aria-label={`${d.moveDown}: ${unit.name}`}
                    className="px-2 py-[2px] leading-none"
                  >
                    ↓
                  </SmallButton>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "font-semibold",
                        !unit.isVisible && "text-hidden-ink",
                      )}
                    >
                      {unit.name}
                    </span>
                    <Tag tone={unit.isVisible ? "pass" : "neutral"}>
                      {unit.isVisible ? d.tagVisible : d.tagHidden}
                    </Tag>
                    {unit.generated ? <Tag tone="brand">{d.tagAi}</Tag> : null}
                  </div>
                  <p className="mt-[2px] text-[11.5px] text-muted">
                    {d.unitStats(
                      difficultyLabel[unit.difficulty] ?? unit.difficulty,
                      unit.wordCount,
                      unit.activityCount,
                    )}
                  </p>
                </div>

                <div className="flex flex-none items-center gap-2 sm:ml-auto">
                  <SmallButton
                    tone={unit.isVisible ? "secondary" : "soft"}
                    onClick={() => {
                      if (
                        unit.isVisible &&
                        !window.confirm(d.hideUnitConfirm(unit.name))
                      ) {
                        return;
                      }
                      setUnitVisible(unit.id, !unit.isVisible);
                    }}
                  >
                    {unit.isVisible ? d.hide : d.show}
                  </SmallButton>
                  <Link
                    href={`${base}/unit/${unit.id}`}
                    className="press rounded-xl border-2 border-ink bg-surface px-3 py-[8px] text-[12.5px] font-bold hard-1"
                  >
                    {d.edit}
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
