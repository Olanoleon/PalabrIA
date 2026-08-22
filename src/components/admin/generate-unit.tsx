"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateUnitDraft,
  regenerateUnit,
  saveGeneratedUnit,
  type GenerationResult,
} from "@/lib/actions/admin";
import { Panel, Tag } from "@/components/admin/pieces";
import { SparkleIcon } from "@/components/ui/icons";
import { Field, Select, SmallButton, TextArea } from "@/components/admin/form-bits";
import { cn } from "@/lib/cn";
import type { GeneratedUnit } from "@/lib/unit-schema";
import type { Difficulty } from "@/generated/prisma";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

const ERROR_HELP: Record<Lang, Record<string, string>> = {
  es: {
    not_configured:
      "Falta OPENAI_API_KEY en el servidor. Configúrala en Railway y vuelve a intentar.",
    timeout: "El modelo tardó demasiado. Reintenta: se conservan tus datos.",
    invalid_response:
      "La respuesta no cumplió el formato esperado. Reintenta o ajusta los datos.",
    api_error: "OpenAI devolvió un error. Reintenta en un momento.",
    empty: "El modelo no devolvió contenido. Reintenta.",
  },
  en: {
    not_configured:
      "OPENAI_API_KEY is not set on the server. Configure it in Railway and try again.",
    timeout: "The model took too long. Retry — your inputs are kept.",
    invalid_response:
      "The answer did not match the expected shape. Retry or adjust the inputs.",
    api_error: "OpenAI returned an error. Try again in a moment.",
    empty: "The model returned nothing. Retry.",
  },
};

/**
 * The generation flow from the PRD: choose the word count and paragraph
 * difficulty, give a topic or a word list, generate, review, edit, then save
 * and decide visibility. Nothing is written until the administrator saves.
 */
export function GenerateUnit({
  areaId,
  areaName,
  base,
  lang,
  /**
   * When present the draft replaces this unit's content instead of creating a
   * new unit, and the form starts from the request that produced it.
   */
  replacing,
}: {
  areaId: string;
  areaName: string;
  base: "/admin" | "/super";
  lang: Lang;
  replacing?: {
    unitId: string;
    unitName: string;
    /** Falls back to this when no request was stored, so regenerating a unit
     *  cannot silently change its difficulty. */
    currentDifficulty: Difficulty;
    currentWordCount: number;
    previousInput: {
      wordCount?: number;
      difficulty?: Difficulty;
      topic?: string;
      wordList?: string[];
    } | null;
  };
}) {
  const d = adminT(lang);
  const DIFFICULTIES: Array<{ value: Difficulty; label: string }> = [
    { value: "VERY_EASY", label: d.difficultyVeryEasyLong },
    { value: "EASY", label: d.difficultyEasyLong },
    { value: "MEDIUM", label: d.difficultyMediumLong },
    { value: "HARD", label: d.difficultyHardLong },
  ];
  const router = useRouter();
  const [result, generate, generating] = useActionState<GenerationResult, FormData>(
    generateUnitDraft,
    {},
  );
  const [draft, setDraft] = useState<GeneratedUnit | null>(null);
  const [adopted, setAdopted] = useState<GeneratedUnit | null>(null);
  const [edited, setEdited] = useState(false);
  const [visible, setVisible] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // A regeneration replaces whatever was under review. Comparing identity (not
  // emptiness) is what makes "Regenerar" discard the previous draft instead of
  // leaving the old edits on screen. Setting state during render is the
  // supported way to derive state from a changed input; it settles immediately.
  if (result.unit && result.unit !== adopted) {
    setAdopted(result.unit);
    setDraft(result.unit);
    setEdited(false);
  }
  const active = draft;

  const prior = replacing?.previousInput ?? null;
  const fallbackDifficulty =
    prior?.difficulty ?? replacing?.currentDifficulty ?? "EASY";
  const difficulty = (result.input?.difficulty ?? fallbackDifficulty) as Difficulty;
  const blocking = (result.issues ?? []).filter((i) => i.level === "error");
  const warnings = (result.issues ?? []).filter((i) => i.level === "warning");

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title={replacing ? d.regenerateTitle : d.generateTitle}
        description={
          replacing ? d.regenerateOf(replacing.unitName) : d.generateArea(areaName)
        }
        actions={
          <button
            type="button"
            onClick={() => {
              // A generated draft cost a paid model call, so leaving with one
              // unsaved is worth a confirmation rather than a silent loss.
              if (
                active &&
                !window.confirm(
                  d.generateBackConfirm,
                )
              ) {
                return;
              }
              router.push(
                replacing ? `${base}/unit/${replacing.unitId}` : `${base}/content/${areaId}`,
              );
            }}
            className="press rounded-xl border-2 border-ink bg-surface px-3 py-[8px] text-[12.5px] font-bold hard-1"
          >
            {replacing ? d.regenerateBack : d.generateBack}
          </button>
        }
      >
        <form action={generate} className="flex flex-col gap-4">
          <input type="hidden" name="areaId" value={areaId} />
          {replacing ? (
            <p className="rounded-xl border-2 border-dashed border-ink bg-cream px-3 py-2 text-[12.5px] leading-[1.45] text-body">
              {d.regenerateWarn}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={d.generateWords}
              name="wordCount"
              type="number"
              min={4}
              max={12}
              defaultValue={result.input?.wordCount ?? prior?.wordCount ?? replacing?.currentWordCount ?? 6}
              required
              hint={d.generateWordsHint}
            />
            <Select
              label={d.generateDifficulty}
              name="difficulty"
              defaultValue={result.input?.difficulty ?? fallbackDifficulty}
            >
              {DIFFICULTIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={d.generateTopic}
              name="topic"
              defaultValue={result.input?.topic ?? prior?.topic ?? ""}
              placeholder="Cooking Italian food"
              hint={d.generateTopicHint}
            />
            <TextArea
              label={d.generateList}
              name="wordList"
              defaultValue={result.input?.wordList?.join(", ") ?? prior?.wordList?.join(", ") ?? ""}
              placeholder="boil, fry, chop, stir, slice, season"
              hint={d.generateListHint}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SmallButton
              type="submit"
              tone="ai"
              disabled={generating}
              className="inline-flex items-center gap-2"
            >
              <SparkleIcon size={15} />
              {generating
                ? d.generating
                : active
                  ? d.generateAgain
                  : d.generateSubmit}
            </SmallButton>
            {generating ? (
              <span className="text-[12.5px] text-muted-2">
                {d.generateWait}
              </span>
            ) : null}
          </div>

          {result.error ? (
            <div className="rounded-xl border-2 border-ink bg-cream px-3 py-2 text-[12.5px] font-medium text-brand-dark">
              {result.error}
              {result.errorCode && ERROR_HELP[lang][result.errorCode] ? (
                <span className="mt-1 block font-normal text-body">
                  {ERROR_HELP[lang][result.errorCode]}
                </span>
              ) : null}
            </div>
          ) : null}
        </form>
      </Panel>

      {active ? (
        <Panel
          title={d.reviewTitle}
          description={d.reviewNote}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <SmallButton
                onClick={() => {
                  if (
                    !window.confirm(d.reviewDiscardConfirm)
                  ) {
                    return;
                  }
                  // Keep `adopted` pointing at this result: clearing it would
                  // make the render-phase guard re-adopt the same draft.
                  setDraft(null);
                  setSaveError(null);
                  setEdited(false);
                }}
              >
                {d.discard}
              </SmallButton>
              {replacing ? null : (
                <label className="flex items-center gap-2 text-[12.5px] font-semibold">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(event) => setVisible(event.target.checked)}
                    className="size-4 accent-[#EA580C]"
                  />
                  {d.reviewVisibleOnSave}
                </label>
              )}
              <SmallButton
                tone="primary"
                disabled={saving || blocking.length > 0}
                onClick={() => {
                  if (
                    replacing &&
                    !window.confirm(d.regenerateConfirm(replacing.unitName))
                  ) {
                    return;
                  }
                  startSaving(async () => {
                    setSaveError(null);
                    const outcome = replacing
                      ? await regenerateUnit(replacing.unitId, active, {
                          difficulty,
                          generationInput: result.input ?? null,
                          edited,
                        })
                      : await saveGeneratedUnit(areaId, active, {
                          difficulty,
                          visible,
                          generationInput: result.input ?? null,
                          edited,
                        });
                    if ("error" in outcome) {
                      setSaveError(outcome.error);
                      return;
                    }
                    router.push(`${base}/unit/${outcome.unitId}`);
                  });
                }}
              >
                {replacing
                  ? saving
                    ? d.regenerateSaving
                    : d.regenerateSave
                  : saving
                    ? d.reviewSaving
                    : d.reviewSave}
              </SmallButton>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            {blocking.length || warnings.length ? (
              <ul className="flex flex-col gap-2">
                {[...blocking, ...warnings].map((issue, index) => (
                  <li
                    key={index}
                    className={cn(
                      "rounded-xl border-2 px-3 py-2 text-[12.5px]",
                      issue.level === "error"
                        ? "border-ink bg-cream text-brand-dark"
                        : "border-muted-line bg-locked text-muted-2",
                    )}
                  >
                    <Tag tone={issue.level === "error" ? "warn" : "neutral"}>
                      {issue.level === "error" ? d.issueBlocking : d.issueWarning}
                    </Tag>{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}

            {saveError ? (
              <div className="rounded-xl border-2 border-ink bg-cream px-3 py-2 text-[12.5px] font-medium text-brand-dark">
                {saveError}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={d.draftTitle}
                value={active.title}
                onChange={(event) => {
                  setDraft({ ...active, title: event.target.value });
                  setEdited(true);
                }}
              />
              <Field
                label={d.draftSubtitle}
                value={active.subtitle}
                onChange={(event) => {
                  setDraft({ ...active, subtitle: event.target.value });
                  setEdited(true);
                }}
              />
            </div>

            <TextArea
              label={d.unitParagraphEn}
              value={active.introParagraph}
              onChange={(event) => {
                setDraft({ ...active, introParagraph: event.target.value });
                setEdited(true);
              }}
            />
            <TextArea
              label={d.unitParagraphEs}
              value={active.introParagraphEs}
              onChange={(event) => {
                setDraft({ ...active, introParagraphEs: event.target.value });
                setEdited(true);
              }}
            />

            <div className="flex flex-col gap-3">
              <h3 className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
                {d.draftWords(active.words.length)}
              </h3>
              {active.words.map((word, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border-2 border-ink bg-cream p-3 sm:grid-cols-3"
                >
                  <Field
                    label={d.wordWord}
                    value={word.text}
                    onChange={(event) => {
                      const words = active.words.slice();
                      words[index] = { ...word, text: event.target.value };
                      setDraft({ ...active, words });
                      setEdited(true);
                    }}
                  />
                  <Field
                    label={d.wordIpa}
                    value={word.ipa}
                    onChange={(event) => {
                      const words = active.words.slice();
                      words[index] = { ...word, ipa: event.target.value };
                      setDraft({ ...active, words });
                      setEdited(true);
                    }}
                  />
                  <Field
                    label={d.wordTranslation}
                    value={word.translation}
                    onChange={(event) => {
                      const words = active.words.slice();
                      words[index] = { ...word, translation: event.target.value };
                      setDraft({ ...active, words });
                      setEdited(true);
                    }}
                  />
                  <TextArea
                    className="sm:col-span-2"
                    label={d.wordDefEs}
                    value={word.definitionEs}
                    onChange={(event) => {
                      const words = active.words.slice();
                      words[index] = { ...word, definitionEs: event.target.value };
                      setDraft({ ...active, words });
                      setEdited(true);
                    }}
                  />
                  <Field
                    label={d.wordExampleEn}
                    value={word.exampleSentence}
                    onChange={(event) => {
                      const words = active.words.slice();
                      words[index] = { ...word, exampleSentence: event.target.value };
                      setDraft({ ...active, words });
                      setEdited(true);
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
                {d.draftActivities(active.activities.length)}
              </h3>
              {active.activities.map((activity, index) => (
                <div
                  key={index}
                  className="rounded-2xl border-2 border-ink bg-surface p-3 text-[12.5px]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone="brand">{activity.type}</Tag>
                    <strong>
                      {activity.type === "MATCH_UP"
                        ? (activity.pairs ?? []).map((pair) => pair.en).join(" · ")
                        : activity.word}
                    </strong>
                    <span className="text-muted-2">{activity.promptEs}</span>
                  </div>
                  {activity.sentence ? (
                    <p className="mt-1 italic text-body">{activity.sentence}</p>
                  ) : null}
                  {/*
                    Match-ups get their own row: rendering them through the
                    options list below would show three English words with the
                    first arbitrarily marked correct, and no meanings at all.
                  */}
                  {activity.type === "MATCH_UP" ? (
                    <ul className="mt-1 flex flex-col gap-1">
                      {(activity.pairs ?? []).map((pair, pairIndex) => (
                        <li
                          key={pairIndex}
                          className="flex flex-wrap items-baseline gap-2"
                        >
                          <span className="font-bold">{pair.en}</span>
                          <span className="text-muted-2">→</span>
                          <span>{pair.es}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {activity.type !== "MATCH_UP" && activity.options.length ? (
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {activity.options.map((option, optionIndex) => (
                        <li
                          key={optionIndex}
                          className={cn(
                            "rounded-full border-[1.5px] px-[9px] py-[2px]",
                            optionIndex === activity.answerIndex
                              ? "border-pass bg-pass-soft font-bold text-pass-deep"
                              : "border-muted-line bg-locked text-muted-2",
                          )}
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
