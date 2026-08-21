"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ORG_MODE_COOKIE, requireRole } from "@/lib/rbac";
import { hashPassword, normalizeEmail } from "@/lib/auth";
import { reviewPayment, updateSettings } from "@/lib/billing";
import { defaultTemplateId, replicateTemplateToOrg } from "@/lib/replicate";
import type { ActionState } from "@/lib/actions/admin";

async function superAdmin() {
  return requireRole("SUPER_ADMIN");
}

function revalidateSuper() {
  revalidatePath("/super", "layout");
  revalidatePath("/admin", "layout");
}

// ── Organizations ───────────────────────────────────────────────────────────

const OrgSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Creates an organization and replicates the seeded Global Template into it as
 * an independent copy. From that moment the two are unrelated: template edits
 * never reach this organization, and its edits never reach the template.
 */
export async function createOrganization(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await superAdmin();
  const parsed = OrgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "Escribe el nombre de la organización." };

  const base = slugify(parsed.data.name) || "org";
  let slug = base;
  for (let n = 2; await prisma.organization.findUnique({ where: { slug } }); n++) {
    slug = `${base}-${n}`;
  }

  const org = await prisma.organization.create({
    data: { name: parsed.data.name, slug },
  });

  const templateId = await defaultTemplateId();
  if (!templateId) {
    revalidateSuper();
    return {
      error:
        "Se creó la organización, pero no hay plantilla global sembrada, así que no se replicó contenido.",
    };
  }
  const counts = await replicateTemplateToOrg(templateId, org.id);
  revalidateSuper();
  return {
    notice: `Organización creada. Se replicaron ${counts.areas} áreas y ${counts.units} unidades (ocultas).`,
  };
}

export async function renameOrganization(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await superAdmin();
  const orgId = String(formData.get("orgId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "El nombre es demasiado corto." };
  await prisma.organization.update({ where: { id: orgId }, data: { name } });
  revalidateSuper();
  return { notice: "Organización actualizada." };
}

/** Deactivating blocks every member's sign-in without touching their data. */
export async function setOrganizationActive(orgId: string, isActive: boolean) {
  await superAdmin();
  await prisma.$transaction([
    prisma.organization.update({ where: { id: orgId }, data: { isActive } }),
    prisma.user.updateMany({ where: { orgId }, data: { isActive } }),
  ]);
  revalidateSuper();
}

/**
 * Permanently removes an organization with its people and content. Guarded by a
 * typed confirmation because the cascade reaches learner progress.
 */
export async function deleteOrganization(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await superAdmin();
  const orgId = String(formData.get("orgId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    include: { _count: { select: { learners: true } } },
  });
  if (confirm !== org.name) {
    return { error: "Escribe el nombre exacto de la organización para confirmar." };
  }

  await prisma.organization.delete({ where: { id: orgId } });

  // Leaving Organization Mode pointed at a deleted org would strand the console.
  const jar = await cookies();
  if (jar.get(ORG_MODE_COOKIE)?.value === orgId) jar.delete(ORG_MODE_COOKIE);

  revalidateSuper();
  return {
    notice: `Se eliminó "${org.name}" con sus ${org._count.learners} aprendices y su contenido.`,
  };
}

// ── Organization admins ─────────────────────────────────────────────────────

const AdminSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
});

export async function createOrgAdmin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await superAdmin();
  const parsed = AdminSchema.safeParse({
    orgId: formData.get("orgId"),
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: "Revisa el nombre y el correo." };

  const email = normalizeEmail(parsed.data.email);
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Ya existe una cuenta con ese correo." };
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(email),
      name: parsed.data.name,
      role: "ORG_ADMIN",
      orgId: parsed.data.orgId,
      mustChangePassword: true,
    },
  });
  revalidateSuper();
  return {
    notice: `Administrador creado. Su contraseña inicial es su propio correo (${email}) y tendrá que cambiarla al entrar.`,
  };
}

export async function setUserActive(userId: string, isActive: boolean) {
  await superAdmin();
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidateSuper();
}

export async function deleteOrgAdmin(userId: string) {
  await superAdmin();
  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (target.role !== "ORG_ADMIN") throw new Error("Not an organization admin");
  await prisma.user.delete({ where: { id: userId } });
  revalidateSuper();
}

// ── Organization Mode ───────────────────────────────────────────────────────

/**
 * Enters an organization's content environment. Everything the Super Admin
 * edits from here belongs to that organization only — never the template.
 */
export async function enterOrganizationMode(orgId: string) {
  await superAdmin();
  await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  (await cookies()).set(ORG_MODE_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  revalidateSuper();
  redirect("/super/content");
}

export async function leaveOrganizationMode() {
  await superAdmin();
  (await cookies()).delete(ORG_MODE_COOKIE);
  revalidateSuper();
  redirect("/super/content");
}

// ── Payment queue ───────────────────────────────────────────────────────────

export async function decidePayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await superAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (decision !== "CONFIRMED" && decision !== "REJECTED") {
    return { error: "Decisión no válida." };
  }
  if (decision === "REJECTED" && !note) {
    return { error: "Escribe el motivo del rechazo." };
  }

  await reviewPayment(paymentId, decision, user.id, note);
  revalidateSuper();
  revalidatePath("/payments");
  return {
    notice:
      decision === "CONFIRMED"
        ? "Pago confirmado."
        : "Pago rechazado. El acceso volvió al estado anterior.",
  };
}

// ── Platform settings ───────────────────────────────────────────────────────

const SettingsSchema = z.object({
  brebKey: z.string().trim().max(120),
  monthlyAmount: z.coerce.number().int().min(0).max(100_000_000),
  currency: z.string().trim().length(3).toUpperCase(),
  graceDays: z.coerce.number().int().min(0).max(60),
  openaiModel: z.string().trim().min(2).max(60),
});

export async function savePlatformSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await superAdmin();
  const parsed = SettingsSchema.safeParse({
    brebKey: formData.get("brebKey"),
    monthlyAmount: formData.get("monthlyAmount"),
    currency: formData.get("currency"),
    graceDays: formData.get("graceDays"),
    openaiModel: formData.get("openaiModel"),
  });
  if (!parsed.success) {
    return { error: "Revisa los valores: moneda de 3 letras y números válidos." };
  }
  await updateSettings(parsed.data);
  revalidateSuper();
  revalidatePath("/payments");
  return { notice: "Configuración guardada." };
}
