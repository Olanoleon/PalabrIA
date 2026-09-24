"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteUnit,
  dismissRegenerationError,
  setUnitVisible,
  startUnitRegeneration,
  updateUnitMeta,
  updateWord,
} from "@/lib/actions/admin";
import { Panel, Tag } from "@/components/admin/pieces";
import { ActionForm, Field, SmallButton, TextArea } from "@/components/admin/form-bits";
import { SparkleIcon } from "@/components/ui/icons";
import { RegenerationWatch } from "@/components/admin/regeneration-watch";
import { isRegenerating } from "@/lib/regeneration";
import { cn } from "@/lib/cn";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

type UnitData = {
  id: string;
  name: string;
  subtitle: string;
  subtitleEn: string;
  isVisible: boolean;
  difficulty: string;
  introParagraph: string;
  introParagraphEs: string;
  generatedAt: Date | null;
  editedAfterGen: boolean;
  generationInput: unknown;
  regeneratingSince: Date | null;
  regenerationError: string | null;
  area: { id: string; name: string };
  words: Array<{
    id: string;
    text: string;
    translation: string;
    definition: string;
    definitionEs: string;
    ipa: string;
    syllables: string;
    stress: string;
    pos: string;
    exampleSentence: string;
    exampleSentenceEs: string;
  }>;
  activities: Array<{
    id: string;
    type: string;
    promptEs: string;
    sentence: string | null;
    options: unknown;
    answerIndex: number;
    noteEs: string;
    word: { text: string };
  }>;
};

export function UnitEditor({
  unit,
  base,
  lang,
}: {
  unit: UnitData;
  base: "/admin" | "/super";
  lang: Lang;
}) {
  const d = adminT(lang);
  const router = useRouter();
  const [regenerating, startRegenerating] = useTransition();
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const options = (raw: unknown): string[] =>
    Array.isArray(raw) ? (raw as string[]) : [];

  /*
    A unit whose content is being replaced wholesale has nothing worth editing:
    every word and question on this screen is about to stop existing, and a
    save landing mid-replacement would be written over without a trace. So the
    editor is not rendered at all while the job runs — the page waits instead,
    and picks itself up when the work lands.
  */
  if (isRegenerating(unit.regeneratingSince)) {
    return (
      <div className="flex flex-col gap-5">
        <RegenerationWatch />
        <Panel
          title={unit.name}
          description={d.unitMeta(
            unit.area.name,
            unit.words.length,
            unit.activities.length,
          )}
        >
          <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-ink bg-cream p-5">
            <Tag tone="brand">
              <span className="inline-flex items-center gap-2">
                <SparkleIcon size={12} />
                {d.regeneratingTag}
              </span>
            </Tag>
            <h2 className="font-display text-[19px] font-semibold tracking-[-0.02em]">
              {d.regenerateLockedTitle}
            </h2>
            <p className="max-w-[60ch] text-[13px] leading-[1.5] text-body">
              {d.regenerateLockedBody}
            </p>
            <Link
              href={`${base}/content/${unit.area.id}`}
              className="press rounded-xl border-2 border-ink bg-surface px-3 py-[8px] text-[12.5px] font-bold hard-1"
            >
              {d.unitBackToArea}
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title={unit.name}
        description={d.unitMeta(unit.area.name, unit.words.length, unit.activities.length)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={unit.isVisible ? "pass" : "neutral"}>
              {unit.isVisible ? d.tagVisible : d.tagHidden}
            </Tag>
            {unit.generatedAt ? <Tag tone="brand">{d.tagAiGenerated}</Tag> : null}
            {unit.editedAfterGen ? <Tag>{d.tagEdited}</Tag> : null}
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
            {/*
              One click, not a form: the inputs that produced this unit are
              stored on it, so the only thing the old screen asked for was a
              retype of what the server already knows.
            */}
            <button
              type="button"
              disabled={regenerating}
              onClick={() => {
                if (!window.confirm(d.regenerateNowConfirm(unit.name))) return;
                setRegenerateError(null);
                startRegenerating(async () => {
                  const outcome = await startUnitRegeneration(unit.id);
                  if ("error" in outcome) {
                    setRegenerateError(outcome.error);
                    return;
                  }
                  // Returns as soon as the unit is marked; the work carries on
                  // server-side and this render swaps to the locked screen.
                  router.refresh();
                });
              }}
              className="press inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-ai px-3 py-[8px] text-[12.5px] font-bold text-ai-ink hard-1 disabled:opacity-60"
            >
              <SparkleIcon size={14} />
              {regenerating ? d.regenerateNowRunning : d.regenerateLink}
            </button>
            {/*
              The long way round, for changing the topic, the word list or the
              difficulty. In the header rather than beside the stored request,
              because a hand-seeded unit has no stored request to show and would
              otherwise lose the screen entirely.
            */}
            <Link
              href={`${base}/unit/${unit.id}/regenerate`}
              className="press inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-surface px-3 py-[8px] text-[12.5px] font-bold hard-1"
            >
              {d.regenerateOtherInputs}
            </Link>
            <Link
              href={`${base}/content/${unit.area.id}`}
              className="press rounded-xl border-2 border-ink bg-surface px-3 py-[8px] text-[12.5px] font-bold hard-1"
            >
              {d.unitBackToArea}
            </Link>
          </div>
        }
      >
        {unit.regenerationError ? (
          <div className="mb-4 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-[12.5px] text-brand-dark">
            <p className="font-medium">
              {d.regenerateFailed} {unit.regenerationError}
            </p>
            <button
              type="button"
              onClick={() => dismissRegenerationError(unit.id)}
              className="mt-2 text-[12px] font-bold underline"
            >
              {d.regenerateDismiss}
            </button>
          </div>
        ) : null}
        {regenerateError ? (
          <p className="mb-4 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-[12.5px] font-medium text-brand-dark">
            {regenerateError}
          </p>
        ) : null}
        <ActionForm
          action={updateUnitMeta}
          submitLabel={d.unitSave}
          hidden={{ unitId: unit.id }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={d.name} name="name" defaultValue={unit.name} required />
            <Field
              label={d.unitSubtitleEs}
              name="subtitle"
              defaultValue={unit.subtitle}
            />
            <Field
              label={d.unitSubtitleEn}
              name="subtitleEn"
              defaultValue={unit.subtitleEn}
            />
          </div>
          <TextArea
            label={d.unitParagraphEn}
            name="introParagraph"
            defaultValue={unit.introParagraph}
          />
          <TextArea
            label={d.unitParagraphEs}
            name="introParagraphEs"
            defaultValue={unit.introParagraphEs}
          />
        </ActionForm>
      </Panel>

      <Panel title={d.wordsTitle}>
        <div className="flex flex-col gap-4">
          {unit.words.map((word) => (
            <ActionForm
              key={word.id}
              action={updateWord}
              submitLabel={d.wordSave}
              tone="soft"
              hidden={{ wordId: word.id }}
              className="rounded-2xl border-2 border-ink bg-cream p-3"
            >
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label={d.wordWord} name="text" defaultValue={word.text} required />
                <Field label={d.wordIpa} name="ipa" defaultValue={word.ipa} />
                <Field label={d.wordSyllables} name="syllables" defaultValue={word.syllables} />
                <Field label={d.wordStress} name="stress" defaultValue={word.stress} />
                <Field
                  label={d.wordTranslation}
                  name="translation"
                  defaultValue={word.translation}
                />
                <Field label={d.wordPos} name="pos" defaultValue={word.pos} />
                <Field
                  className="sm:col-span-2"
                  label={d.wordDefEn}
                  name="definition"
                  defaultValue={word.definition}
                />
                <Field
                  className="sm:col-span-2"
                  label={d.wordDefEs}
                  name="definitionEs"
                  defaultValue={word.definitionEs}
                />
                <Field
                  className="sm:col-span-2"
                  label={d.wordExampleEn}
                  name="exampleSentence"
                  defaultValue={word.exampleSentence}
                />
                <Field
                  className="sm:col-span-2"
                  label={d.wordExampleEs}
                  name="exampleSentenceEs"
                  defaultValue={word.exampleSentenceEs}
                />
              </div>
            </ActionForm>
          ))}
        </div>
      </Panel>

      <Panel
        title={d.activitiesTitle}
        description={d.activitiesNote}
      >
        <div className="flex flex-col gap-2">
          {unit.activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-2xl border-2 border-ink bg-surface p-3 text-[12.5px]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="brand">{activity.type}</Tag>
                <strong>{activity.word.text}</strong>
                <span className="text-muted-2">{activity.promptEs}</span>
              </div>
              {activity.sentence ? (
                <p className="mt-1 italic text-body">{activity.sentence}</p>
              ) : null}
              {options(activity.options).length ? (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {options(activity.options).map((option, index) => (
                    <li
                      key={index}
                      className={cn(
                        "rounded-full border-[1.5px] px-[9px] py-[2px]",
                        index === activity.answerIndex
                          ? "border-pass bg-pass-soft font-bold text-pass-deep"
                          : "border-muted-line bg-locked text-muted-2",
                      )}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-1 text-[11.5px] text-muted-2">{activity.noteEs}</p>
            </div>
          ))}
        </div>
      </Panel>

      {unit.generationInput ? (
        <Panel
          title={d.originalRequest}
          description={d.originalRequestNote}
        >
          <pre className="overflow-x-auto rounded-xl border-2 border-ink bg-locked p-3 font-mono text-[11.5px]">
            {JSON.stringify(unit.generationInput, null, 2)}
          </pre>
        </Panel>
      ) : null}

      <Panel title={d.dangerZone}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-[12.5px] text-body">
            {d.dangerNote}
          </p>
          <SmallButton
            tone="danger"
            onClick={async () => {
              if (
                !window.confirm(
                  d.deleteUnitConfirm(unit.name),
                )
              ) {
                return;
              }
              await deleteUnit(unit.id);
            }}
          >
            {d.deleteUnit}
          </SmallButton>
        </div>
      </Panel>
    </div>
  );
}
