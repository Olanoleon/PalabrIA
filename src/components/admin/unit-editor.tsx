"use client";

import Link from "next/link";
import { deleteUnit, setUnitVisible, updateUnitMeta, updateWord } from "@/lib/actions/admin";
import { Panel, Tag } from "@/components/admin/pieces";
import { ActionForm, Field, SmallButton, TextArea } from "@/components/admin/form-bits";
import { cn } from "@/lib/cn";

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
}: {
  unit: UnitData;
  base: "/admin" | "/super";
}) {
  const options = (raw: unknown): string[] =>
    Array.isArray(raw) ? (raw as string[]) : [];

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title={unit.name}
        description={`${unit.area.name} · ${unit.words.length} palabras · ${unit.activities.length} actividades`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={unit.isVisible ? "pass" : "neutral"}>
              {unit.isVisible ? "visible" : "oculta"}
            </Tag>
            {unit.generatedAt ? <Tag tone="brand">generada con IA</Tag> : null}
            {unit.editedAfterGen ? <Tag>editada</Tag> : null}
            <SmallButton
              tone={unit.isVisible ? "secondary" : "soft"}
              onClick={() => setUnitVisible(unit.id, !unit.isVisible)}
            >
              {unit.isVisible ? "Ocultar" : "Mostrar"}
            </SmallButton>
            <Link
              href={`${base}/content/${unit.area.id}`}
              className="press rounded-xl border-2 border-ink bg-surface px-3 py-[8px] text-[12.5px] font-bold hard-1"
            >
              Volver al área
            </Link>
          </div>
        }
      >
        <ActionForm
          action={updateUnitMeta}
          submitLabel="Guardar unidad"
          hidden={{ unitId: unit.id }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nombre" name="name" defaultValue={unit.name} required />
            <Field
              label="Subtítulo (español)"
              name="subtitle"
              defaultValue={unit.subtitle}
            />
            <Field
              label="Subtítulo (inglés)"
              name="subtitleEn"
              defaultValue={unit.subtitleEn}
            />
          </div>
          <TextArea
            label="Párrafo en inglés"
            name="introParagraph"
            defaultValue={unit.introParagraph}
          />
          <TextArea
            label="Párrafo en español"
            name="introParagraphEs"
            defaultValue={unit.introParagraphEs}
          />
        </ActionForm>
      </Panel>

      <Panel title="Palabras">
        <div className="flex flex-col gap-4">
          {unit.words.map((word) => (
            <ActionForm
              key={word.id}
              action={updateWord}
              submitLabel="Guardar palabra"
              tone="soft"
              hidden={{ wordId: word.id }}
              className="rounded-2xl border-2 border-ink bg-cream p-3"
            >
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Palabra" name="text" defaultValue={word.text} required />
                <Field label="IPA" name="ipa" defaultValue={word.ipa} />
                <Field label="Sílabas" name="syllables" defaultValue={word.syllables} />
                <Field label="Acento" name="stress" defaultValue={word.stress} />
                <Field
                  label="Traducción"
                  name="translation"
                  defaultValue={word.translation}
                />
                <Field label="Categoría" name="pos" defaultValue={word.pos} />
                <Field
                  className="sm:col-span-2"
                  label="Definición (inglés)"
                  name="definition"
                  defaultValue={word.definition}
                />
                <Field
                  className="sm:col-span-2"
                  label="Definición (español)"
                  name="definitionEs"
                  defaultValue={word.definitionEs}
                />
                <Field
                  className="sm:col-span-2"
                  label="Ejemplo (inglés)"
                  name="exampleSentence"
                  defaultValue={word.exampleSentence}
                />
                <Field
                  className="sm:col-span-2"
                  label="Ejemplo (español)"
                  name="exampleSentenceEs"
                  defaultValue={word.exampleSentenceEs}
                />
              </div>
            </ActionForm>
          ))}
        </div>
      </Panel>

      <Panel
        title="Actividades"
        description="Se generan con la unidad; edítalas regenerando o ajustando las palabras."
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
          title="Petición original"
          description="Se conserva para poder regenerar con los mismos datos."
        >
          <pre className="overflow-x-auto rounded-xl border-2 border-ink bg-locked p-3 font-mono text-[11.5px]">
            {JSON.stringify(unit.generationInput, null, 2)}
          </pre>
        </Panel>
      ) : null}

      <Panel title="Zona de riesgo">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-[12.5px] text-body">
            Ocultar es reversible y conserva el progreso. Eliminar borra la unidad y
            el progreso de los aprendices en ella.
          </p>
          <SmallButton
            tone="danger"
            onClick={async () => {
              if (
                !window.confirm(
                  `¿Eliminar "${unit.name}"? También se borra el progreso de los aprendices en esta unidad.`,
                )
              ) {
                return;
              }
              await deleteUnit(unit.id);
            }}
          >
            Eliminar unidad
          </SmallButton>
        </div>
      </Panel>
    </div>
  );
}
