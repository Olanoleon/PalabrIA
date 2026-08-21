"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateUnitDraft,
  saveGeneratedUnit,
  type GenerationResult,
} from "@/lib/actions/admin";
import { Panel, Tag } from "@/components/admin/pieces";
import { SparkleIcon } from "@/components/ui/icons";
import { Field, Select, SmallButton, TextArea } from "@/components/admin/form-bits";
import { cn } from "@/lib/cn";
import type { GeneratedUnit } from "@/lib/unit-schema";
import type { Difficulty } from "@/generated/prisma";

const DIFFICULTIES: Array<{ value: Difficulty; label: string; hint: string }> = [
  { value: "VERY_EASY", label: "Muy fácil", hint: "A1 · frases cortas" },
  { value: "EASY", label: "Fácil", hint: "A2 · conectores simples" },
  { value: "MEDIUM", label: "Media", hint: "B1 · subordinadas" },
  { value: "HARD", label: "Difícil", hint: "B2–C1 · sintaxis rica" },
];

const ERROR_HELP: Record<string, string> = {
  not_configured:
    "Falta OPENAI_API_KEY en el servidor. Configúrala en Railway y vuelve a intentar.",
  timeout: "El modelo tardó demasiado. Reintenta: se conservan tus datos.",
  invalid_response:
    "La respuesta no cumplió el formato esperado. Reintenta o ajusta los datos.",
  api_error: "OpenAI devolvió un error. Reintenta en un momento.",
  empty: "El modelo no devolvió contenido. Reintenta.",
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
}: {
  areaId: string;
  areaName: string;
  base: "/admin" | "/super";
}) {
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

  const difficulty = (result.input?.difficulty ?? "EASY") as Difficulty;
  const blocking = (result.issues ?? []).filter((i) => i.level === "error");
  const warnings = (result.issues ?? []).filter((i) => i.level === "warning");

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Generar unidad con IA"
        description={`Área: ${areaName}`}
      >
        <form action={generate} className="flex flex-col gap-4">
          <input type="hidden" name="areaId" value={areaId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Número de palabras"
              name="wordCount"
              type="number"
              min={4}
              max={12}
              defaultValue={result.input?.wordCount ?? 6}
              required
              hint="Entre 4 y 12. Es la restricción de mayor prioridad."
            />
            <Select
              label="Dificultad del párrafo"
              name="difficulty"
              defaultValue={result.input?.difficulty ?? "EASY"}
            >
              {DIFFICULTIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.hint}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Tema"
              name="topic"
              defaultValue={result.input?.topic ?? ""}
              placeholder="Cooking Italian food"
              hint="Usa un tema o una lista de palabras."
            />
            <TextArea
              label="Lista de palabras"
              name="wordList"
              defaultValue={result.input?.wordList?.join(", ") ?? ""}
              placeholder="boil, fry, chop, stir, slice, season"
              hint="Si la lista es más larga que el número pedido, manda la lista."
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
                ? "Generando…"
                : active
                  ? "Regenerar unidad"
                  : "Generar unidad"}
            </SmallButton>
            {generating ? (
              <span className="text-[12.5px] text-muted-2">
                Suele tardar entre uno y dos minutos.
              </span>
            ) : null}
          </div>

          {result.error ? (
            <div className="rounded-xl border-2 border-ink bg-cream px-3 py-2 text-[12.5px] font-medium text-brand-dark">
              {result.error}
              {result.errorCode && ERROR_HELP[result.errorCode] ? (
                <span className="mt-1 block font-normal text-body">
                  {ERROR_HELP[result.errorCode]}
                </span>
              ) : null}
            </div>
          ) : null}
        </form>
      </Panel>

      {active ? (
        <Panel
          title="Revisa antes de guardar"
          description="Puedes editar cualquier campo. Se guarda solo cuando lo apruebas."
          actions={
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[12.5px] font-semibold">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(event) => setVisible(event.target.checked)}
                  className="size-4 accent-[#EA580C]"
                />
                Visible al guardar
              </label>
              <SmallButton
                tone="primary"
                disabled={saving || blocking.length > 0}
                onClick={() =>
                  startSaving(async () => {
                    setSaveError(null);
                    const outcome = await saveGeneratedUnit(areaId, active, {
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
                  })
                }
              >
                {saving ? "Guardando…" : "Guardar unidad"}
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
                      {issue.level === "error" ? "bloqueante" : "aviso"}
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
                label="Título"
                value={active.title}
                onChange={(event) => {
                  setDraft({ ...active, title: event.target.value });
                  setEdited(true);
                }}
              />
              <Field
                label="Subtítulo (español)"
                value={active.subtitle}
                onChange={(event) => {
                  setDraft({ ...active, subtitle: event.target.value });
                  setEdited(true);
                }}
              />
            </div>

            <TextArea
              label="Párrafo en inglés"
              value={active.introParagraph}
              onChange={(event) => {
                setDraft({ ...active, introParagraph: event.target.value });
                setEdited(true);
              }}
            />
            <TextArea
              label="Párrafo en español"
              value={active.introParagraphEs}
              onChange={(event) => {
                setDraft({ ...active, introParagraphEs: event.target.value });
                setEdited(true);
              }}
            />

            <div className="flex flex-col gap-3">
              <h3 className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
                {active.words.length} palabras
              </h3>
              {active.words.map((word, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border-2 border-ink bg-cream p-3 sm:grid-cols-3"
                >
                  <Field
                    label="Palabra"
                    value={word.text}
                    onChange={(event) => {
                      const words = active.words.slice();
                      words[index] = { ...word, text: event.target.value };
                      setDraft({ ...active, words });
                      setEdited(true);
                    }}
                  />
                  <Field
                    label="IPA"
                    value={word.ipa}
                    onChange={(event) => {
                      const words = active.words.slice();
                      words[index] = { ...word, ipa: event.target.value };
                      setDraft({ ...active, words });
                      setEdited(true);
                    }}
                  />
                  <Field
                    label="Traducción"
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
                    label="Definición (español)"
                    value={word.definitionEs}
                    onChange={(event) => {
                      const words = active.words.slice();
                      words[index] = { ...word, definitionEs: event.target.value };
                      setDraft({ ...active, words });
                      setEdited(true);
                    }}
                  />
                  <Field
                    label="Ejemplo"
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
                {active.activities.length} actividades
              </h3>
              {active.activities.map((activity, index) => (
                <div
                  key={index}
                  className="rounded-2xl border-2 border-ink bg-surface p-3 text-[12.5px]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone="brand">{activity.type}</Tag>
                    <strong>{activity.word}</strong>
                    <span className="text-muted-2">{activity.promptEs}</span>
                  </div>
                  {activity.sentence ? (
                    <p className="mt-1 italic text-body">{activity.sentence}</p>
                  ) : null}
                  {activity.options.length ? (
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
