"use client";

import Link from "next/link";
import { deleteUnit, setUnitVisible, updateUnitMeta, updateWord } from "@/lib/actions/admin";
import { Panel, Tag } from "@/components/admin/pieces";
import { ActionForm, Field, SmallButton, TextArea } from "@/components/admin/form-bits";
import { SparkleIcon } from "@/components/ui/icons";
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
  const options = (raw: unknown): string[] =>
    Array.isArray(raw) ? (raw as string[]) : [];

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
            <Link
              href={`${base}/unit/${unit.id}/regenerate`}
              className="press inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-ai px-3 py-[8px] text-[12.5px] font-bold text-ai-ink hard-1"
            >
              <SparkleIcon size={14} />
              {d.regenerateLink}
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
          <Link
            href={`${base}/unit/${unit.id}/regenerate`}
            className="press mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-ai px-3 py-[8px] text-[12.5px] font-bold text-ai-ink hard-1"
          >
            <SparkleIcon size={14} />
            {d.regenerateLink}
          </Link>
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
