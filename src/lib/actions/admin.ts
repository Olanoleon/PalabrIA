"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  activeOrgId,
  areaScopeFilter,
  assertOrgWrite,
  requireRole,
  type CurrentUser,
} from "@/lib/rbac";
import { hashPassword, normalizeEmail } from "@/lib/auth";
import { initialPaidThrough, setOverride } from "@/lib/billing";
import { sendLearnerInvite } from "@/lib/resend";
import { evaluateBadges } from "@/lib/progress";
import { GenerationError, generateUnit } from "@/lib/openai";
import { MAX_WORDS, MIN_WORDS, type GeneratedUnit } from "@/lib/unit-schema";
import { hasBlockingIssue, validateGeneratedUnit, type Issue } from "@/lib/unit-validate";
import { getSettings } from "@/lib/billing";
import type { Difficulty } from "@/generated/prisma";

export type ActionState = { error?: string; notice?: string };

/** Both consoles share these actions; the scope comes from the actor. */
async function actor(): Promise<CurrentUser> {
  return requireRole("ORG_ADMIN", "SUPER_ADMIN");
}

/** The organization being administered, or a hard failure if there is none. */
async function targetOrg(user: CurrentUser): Promise<string> {
  const orgId = await activeOrgId(user);
  if (!orgId) throw new Error("No organization selected");
  assertOrgWrite(user, orgId);
  return orgId;
}

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
  revalidatePath("/super", "layout");
}

// ── Learners ────────────────────────────────────────────────────────────────

const InviteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  team: z.string().trim().max(60).optional(),
  orgId: z.string().trim().min(1).optional(),
});

/**
 * Creates a learner. The initial password is the learner's own email (PRD), and
 * `mustChangePassword` forces a real one at first sign-in.
 */
export async function inviteLearner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await actor();
  const parsed = InviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    team: formData.get("team") || undefined,
    orgId: formData.get("orgId") || undefined,
  });
  if (!parsed.success) {
    return { error: "Revisa el nombre y el correo." };
  }

  // A Super Admin may place a learner in any organization; an Org Admin is
  // always pinned to their own.
  const orgId =
    user.role === "SUPER_ADMIN" && parsed.data.orgId
      ? parsed.data.orgId
      : await targetOrg(user);
  assertOrgWrite(user, orgId);

  const email = normalizeEmail(parsed.data.email);
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Ya existe una cuenta con ese correo." };
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(email),
      name: parsed.data.name,
      role: "LEARNER",
      orgId,
      mustChangePassword: true,
      learner: {
        create: {
          orgId,
          team: parsed.data.team ?? null,
          // A full cycle on the house, so a new learner is never blocked on day one.
          billingStatus: "TRIAL",
          paidThrough: initialPaidThrough(),
        },
      },
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const sent = await sendLearnerInvite(email, parsed.data.name, appUrl);

  revalidateAdmin();
  return {
    notice: sent
      ? `Cuenta creada. Le enviamos la invitación a ${email}.`
      : `Cuenta creada. No hay correo configurado, así que avísale: su contraseña inicial es ${email}.`,
  };
}

export async function updateLearner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await actor();
  const learnerId = String(formData.get("learnerId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const team = String(formData.get("team") ?? "").trim();

  const learner = await prisma.learner.findUniqueOrThrow({
    where: { id: learnerId },
    select: { orgId: true, userId: true },
  });
  assertOrgWrite(user, learner.orgId);

  if (name.length < 2) return { error: "El nombre es demasiado corto." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: learner.userId }, data: { name } }),
    prisma.learner.update({
      where: { id: learnerId },
      data: { team: team || null },
    }),
  ]);
  revalidateAdmin();
  return { notice: "Datos actualizados." };
}

/** Deactivation blocks sign-in outright; progress and XP are untouched. */
export async function setLearnerActive(learnerId: string, isActive: boolean) {
  const user = await actor();
  const learner = await prisma.learner.findUniqueOrThrow({
    where: { id: learnerId },
    select: { orgId: true, userId: true },
  });
  assertOrgWrite(user, learner.orgId);
  await prisma.user.update({ where: { id: learner.userId }, data: { isActive } });
  revalidateAdmin();
}

/**
 * Manual override of the automatic payment status. `status` of null hands the
 * learner back to the daily sweep.
 */
export async function overrideLearnerStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await actor();
  const learnerId = String(formData.get("learnerId") ?? "");
  const raw = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const learner = await prisma.learner.findUniqueOrThrow({
    where: { id: learnerId },
    select: { orgId: true },
  });
  assertOrgWrite(user, learner.orgId);

  if (!note) return { error: "Escribe el motivo del cambio." };

  const status =
    raw === "OVERRIDE_ACTIVE" || raw === "DISABLED" ? raw : null;
  await setOverride(learnerId, status, user.id, note);
  revalidateAdmin();
  return {
    notice: status
      ? "Estado forzado. La revisión automática ya no lo cambia."
      : "Estado devuelto a la revisión automática.",
  };
}

// ── Areas ───────────────────────────────────────────────────────────────────

const AreaSchema = z.object({
  name: z.string().trim().min(2).max(80),
  visible: z.boolean(),
});

const AREA_TINTS = ["#FFEDD5", "#E3F0E8", "#FDECEF", "#EAF0FB", "#FBF3DE", "#E9F3F7"];
const AREA_ICONS = ["sparkle", "body", "food"];

/**
 * Creates an area from just a name. The description and icon are filled by AI
 * (PRD); when OpenAI is not configured, sensible placeholders go in instead so
 * the administrator is never blocked.
 */
export async function createArea(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await actor();
  const parsed = AreaSchema.safeParse({
    name: formData.get("name"),
    visible: formData.get("visible") === "on",
  });
  if (!parsed.success) return { error: "Escribe un nombre para el área." };

  const scope = await areaScopeFilter(user);
  const count = await prisma.area.count({ where: { ...scope, isVisible: undefined } });

  const { description, iconKey } = await describeArea(parsed.data.name);

  const area = await prisma.area.create({
    data: {
      scope: scope.scope,
      orgId: "orgId" in scope ? scope.orgId : null,
      templateId:
        scope.scope === "GLOBAL" ? await defaultTemplateIdOrThrow() : null,
      name: parsed.data.name,
      description,
      iconKey,
      tint: AREA_TINTS[count % AREA_TINTS.length],
      sortOrder: count,
      // Hidden by default (PRD), unless the administrator says otherwise.
      isVisible: parsed.data.visible,
    },
  });

  revalidateAdmin();
  redirect(`${user.role === "SUPER_ADMIN" ? "/super" : "/admin"}/content/${area.id}`);
}

async function defaultTemplateIdOrThrow(): Promise<string> {
  const template = await prisma.globalTemplate.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!template) throw new Error("No global template has been seeded");
  return template.id;
}

/** One short OpenAI call for the area blurb and an icon key. */
async function describeArea(
  name: string,
): Promise<{ description: string; iconKey: string }> {
  const fallback = {
    description: `Vocabulario esencial de ${name.toLowerCase()}, en unidades cortas.`,
    iconKey: "sparkle",
  };
  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const { default: OpenAI } = await import("openai");
    const settings = await getSettings();
    const client = new OpenAI({ timeout: 30_000, maxRetries: 1 });
    const response = await client.chat.completions.create({
      model: settings.openaiModel,
      messages: [
        {
          role: "user",
          content: `A vocabulary area for Spanish-speaking learners of English is called "${name}". Reply with a one-sentence Spanish description (max 130 characters) and pick the closest icon key from: ${AREA_ICONS.join(", ")}.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "area_blurb",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["description", "iconKey"],
            properties: {
              description: { type: "string" },
              iconKey: { type: "string", enum: AREA_ICONS },
            },
          },
        },
      },
    });
    const raw = response.choices[0]?.message?.content;
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { description?: string; iconKey?: string };
    return {
      description: parsed.description?.slice(0, 200) || fallback.description,
      iconKey: AREA_ICONS.includes(parsed.iconKey ?? "") ? parsed.iconKey! : "sparkle",
    };
  } catch (error) {
    console.warn("[openai] area description failed", error);
    return fallback;
  }
}

export async function renameArea(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await actor();
  const areaId = String(formData.get("areaId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (name.length < 2) return { error: "El nombre es demasiado corto." };

  await assertAreaInScope(user, areaId);
  await prisma.area.update({
    where: { id: areaId },
    data: { name, description: description.slice(0, 300) },
  });
  revalidateAdmin();
  return { notice: "Área actualizada." };
}

async function assertAreaInScope(user: CurrentUser, areaId: string) {
  const scope = await areaScopeFilter(user);
  const found = await prisma.area.findFirst({
    where: { ...scope, isVisible: undefined, id: areaId },
    select: { id: true },
  });
  if (!found) throw new Error("Area not in scope");
}

async function assertUnitInScope(user: CurrentUser, unitId: string) {
  const scope = await areaScopeFilter(user);
  const found = await prisma.unit.findFirst({
    where: { id: unitId, area: { ...scope, isVisible: undefined } },
    select: { id: true, areaId: true },
  });
  if (!found) throw new Error("Unit not in scope");
  return found;
}

/**
 * Visibility only. Hiding never deletes: learner progress, XP and the content
 * itself are preserved, and showing the area again restores everything.
 */
export async function setAreaVisible(areaId: string, isVisible: boolean) {
  const user = await actor();
  await assertAreaInScope(user, areaId);
  await prisma.area.update({ where: { id: areaId }, data: { isVisible } });
  revalidateAdmin();
  revalidatePath("/path");
}

export async function setUnitVisible(unitId: string, isVisible: boolean) {
  const user = await actor();
  await assertUnitInScope(user, unitId);
  await prisma.unit.update({ where: { id: unitId }, data: { isVisible } });
  revalidateAdmin();
  revalidatePath("/path");
}

/** Moves an area or unit one place up or down among its siblings. */
export async function reorderArea(areaId: string, direction: "up" | "down") {
  const user = await actor();
  await assertAreaInScope(user, areaId);
  const scope = await areaScopeFilter(user);
  const siblings = await prisma.area.findMany({
    where: { ...scope, isVisible: undefined },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  await swap(siblings, areaId, direction, "area");
  revalidateAdmin();
  revalidatePath("/path");
}

export async function reorderUnit(unitId: string, direction: "up" | "down") {
  const user = await actor();
  const unit = await assertUnitInScope(user, unitId);
  const siblings = await prisma.unit.findMany({
    where: { areaId: unit.areaId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  await swap(siblings, unitId, direction, "unit");
  revalidateAdmin();
  revalidatePath("/path");
}

/**
 * Rewrites the whole sibling list rather than swapping two rows, so a list that
 * has drifted out of sequence is repaired as a side effect.
 */
async function swap(
  siblings: Array<{ id: string }>,
  id: string,
  direction: "up" | "down",
  model: "area" | "unit",
) {
  const index = siblings.findIndex((s) => s.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) return;
  const reordered = siblings.slice();
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await prisma.$transaction(
    reordered.map((sibling, position) =>
      model === "area"
        ? prisma.area.update({ where: { id: sibling.id }, data: { sortOrder: position } })
        : prisma.unit.update({ where: { id: sibling.id }, data: { sortOrder: position } }),
    ),
  );
}

// ── AI unit generation ──────────────────────────────────────────────────────

const GenerateSchema = z.object({
  areaId: z.string().min(1),
  wordCount: z.coerce.number().int().min(MIN_WORDS).max(MAX_WORDS),
  difficulty: z.enum(["VERY_EASY", "EASY", "MEDIUM", "HARD"]),
  topic: z.string().trim().max(200).optional(),
  wordList: z.string().trim().max(600).optional(),
});

export type GenerationResult = {
  error?: string;
  errorCode?: string;
  unit?: GeneratedUnit;
  issues?: Issue[];
  /** Echoed back so the review screen can regenerate with the same inputs. */
  input?: {
    areaId: string;
    wordCount: number;
    difficulty: Difficulty;
    topic?: string;
    wordList?: string[];
  };
};

/**
 * Calls OpenAI and returns the generated unit for review. Nothing is written
 * yet — the administrator must accept it (PRD).
 */
export async function generateUnitDraft(
  _prev: GenerationResult,
  formData: FormData,
): Promise<GenerationResult> {
  const user = await actor();
  const parsed = GenerateSchema.safeParse({
    areaId: formData.get("areaId"),
    wordCount: formData.get("wordCount"),
    difficulty: formData.get("difficulty"),
    topic: formData.get("topic") || undefined,
    wordList: formData.get("wordList") || undefined,
  });
  if (!parsed.success) {
    return { error: `El número de palabras debe estar entre ${MIN_WORDS} y ${MAX_WORDS}.` };
  }

  const area = await prisma.area.findFirst({
    where: {
      ...(await areaScopeFilter(user)),
      isVisible: undefined,
      id: parsed.data.areaId,
    },
    include: { units: { include: { words: { select: { text: true } } } } },
  });
  if (!area) return { error: "Esa área no existe o no puedes editarla." };

  const wordList = (parsed.data.wordList ?? "")
    .split(/[\n,;]+/)
    .map((w) => w.trim())
    .filter(Boolean);

  if (!wordList.length && !parsed.data.topic) {
    return { error: "Escribe un tema o una lista de palabras." };
  }

  const input = {
    areaId: area.id,
    wordCount: parsed.data.wordCount,
    difficulty: parsed.data.difficulty,
    topic: parsed.data.topic,
    wordList: wordList.length ? wordList : undefined,
  };

  const settings = await getSettings();
  try {
    const unit = await generateUnit(
      {
        ...input,
        areaName: area.name,
        existingWords: area.units.flatMap((u) => u.words.map((w) => w.text)),
      },
      settings.openaiModel,
    );
    const issues = validateGeneratedUnit(unit, {
      wordCount: input.wordCount,
      wordList: input.wordList,
    });
    return { unit, issues, input };
  } catch (error) {
    if (error instanceof GenerationError) {
      return { error: error.message, errorCode: error.code, input };
    }
    throw error;
  }
}

/** Persists a reviewed draft. Blocking validation errors are refused here too. */
export async function saveGeneratedUnit(
  areaId: string,
  draft: GeneratedUnit,
  options: {
    difficulty: Difficulty;
    visible: boolean;
    generationInput: unknown;
    edited: boolean;
  },
): Promise<{ unitId: string } | { error: string }> {
  const user = await actor();
  const area = await prisma.area.findFirst({
    where: { ...(await areaScopeFilter(user)), isVisible: undefined, id: areaId },
    select: { id: true },
  });
  if (!area) return { error: "Esa área no existe o no puedes editarla." };

  const issues = validateGeneratedUnit(draft, { wordCount: draft.words.length });
  if (hasBlockingIssue(issues)) {
    return { error: issues.find((i) => i.level === "error")!.message };
  }

  const count = await prisma.unit.count({ where: { areaId } });

  const unit = await prisma.$transaction(async (tx) => {
    const created = await tx.unit.create({
      data: {
        areaId,
        name: draft.title,
        subtitle: draft.subtitle,
        subtitleEn: draft.subtitleEs,
        sortOrder: count,
        isVisible: options.visible,
        difficulty: options.difficulty,
        wordCount: draft.words.length,
        introParagraph: draft.introParagraph,
        introParagraphEs: draft.introParagraphEs,
        generationInput: options.generationInput as never,
        generatedAt: new Date(),
        editedAfterGen: options.edited,
      },
    });

    const wordIds = new Map<string, string>();
    for (const [index, word] of draft.words.entries()) {
      const row = await tx.word.create({
        data: { ...word, unitId: created.id, sortOrder: index },
      });
      wordIds.set(word.text.toLowerCase(), row.id);
    }

    for (const [index, activity] of draft.activities.entries()) {
      const wordId = wordIds.get(activity.word.toLowerCase());
      if (!wordId) continue; // validation already flagged it; skip rather than fail
      await tx.activity.create({
        data: {
          unitId: created.id,
          wordId,
          type: activity.type,
          prompt: activity.prompt,
          promptEs: activity.promptEs,
          sentence: activity.type === "TYPE_WHAT_YOU_HEAR" ? null : activity.sentence,
          options: activity.type === "TYPE_WHAT_YOU_HEAR" ? [] : activity.options,
          answerIndex: activity.type === "TYPE_WHAT_YOU_HEAR" ? 0 : activity.answerIndex,
          note: activity.note,
          noteEs: activity.noteEs,
          mono: activity.type === "IPA_MATCH",
          sortOrder: index,
        },
      });
    }
    return created;
  });

  revalidateAdmin();
  revalidatePath("/path");
  return { unitId: unit.id };
}

// ── Unit editing ────────────────────────────────────────────────────────────

export async function updateUnitMeta(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await actor();
  const unitId = String(formData.get("unitId") ?? "");
  await assertUnitInScope(user, unitId);

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "El nombre es demasiado corto." };

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      name,
      subtitle: String(formData.get("subtitle") ?? "").trim(),
      subtitleEn: String(formData.get("subtitleEn") ?? "").trim(),
      introParagraph: String(formData.get("introParagraph") ?? "").trim(),
      introParagraphEs: String(formData.get("introParagraphEs") ?? "").trim(),
      editedAfterGen: true,
    },
  });
  revalidateAdmin();
  revalidatePath("/path");
  return { notice: "Unidad actualizada." };
}

export async function updateWord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await actor();
  const wordId = String(formData.get("wordId") ?? "");
  const word = await prisma.word.findUniqueOrThrow({
    where: { id: wordId },
    select: { unitId: true },
  });
  await assertUnitInScope(user, word.unitId);

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "La palabra no puede quedar vacía." };

  await prisma.$transaction([
    prisma.word.update({
      where: { id: wordId },
      data: {
        text,
        translation: String(formData.get("translation") ?? "").trim(),
        definition: String(formData.get("definition") ?? "").trim(),
        definitionEs: String(formData.get("definitionEs") ?? "").trim(),
        ipa: String(formData.get("ipa") ?? "").trim(),
        syllables: String(formData.get("syllables") ?? "").trim(),
        stress: String(formData.get("stress") ?? "").trim(),
        pos: String(formData.get("pos") ?? "").trim(),
        exampleSentence: String(formData.get("exampleSentence") ?? "").trim(),
        exampleSentenceEs: String(formData.get("exampleSentenceEs") ?? "").trim(),
      },
    }),
    prisma.unit.update({
      where: { id: word.unitId },
      data: { editedAfterGen: true },
    }),
  ]);
  revalidateAdmin();
  revalidatePath("/path");
  return { notice: "Palabra actualizada." };
}

/**
 * Deleting a unit removes learner progress for it as well (cascade), so it is
 * only for content an administrator regrets creating. Hiding is the safe option
 * and is what the console leads with.
 */
export async function deleteUnit(unitId: string) {
  const user = await actor();
  const unit = await assertUnitInScope(user, unitId);
  await prisma.unit.delete({ where: { id: unitId } });
  revalidateAdmin();
  revalidatePath("/path");
  redirect(
    `${user.role === "SUPER_ADMIN" ? "/super" : "/admin"}/content/${unit.areaId}`,
  );
}

export async function recomputeBadges(learnerId: string) {
  const user = await actor();
  const learner = await prisma.learner.findUniqueOrThrow({
    where: { id: learnerId },
    select: { orgId: true },
  });
  assertOrgWrite(user, learner.orgId);
  await evaluateBadges(learnerId);
  revalidateAdmin();
}
