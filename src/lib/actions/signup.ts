"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isUniqueViolation, prisma } from "@/lib/prisma";
import { hashPassword, normalizeEmail, startSession } from "@/lib/auth";
import { initialPaidThrough } from "@/lib/billing";
import { isLang, t } from "@/lib/i18n";
import { passwordProblem } from "@/lib/password";
import { passwordMessage } from "@/lib/password-message";
import { orgForSignup } from "@/lib/public-data";
import type { FormState } from "@/lib/actions/auth";

/**
 * Learner self-registration.
 *
 * Mirrors `inviteLearner` in `actions/admin.ts` — same nested user+learner
 * create, same trial — but this one is public, which changes four things: there
 * is no `actor()` gate, the learner chooses a real PIN instead of inheriting
 * their own email as a password, nothing forces a password change afterwards,
 * and it signs them in rather than returning a notice to an administrator.
 */

const SignupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
});

function dict(lang: string) {
  return t(isLang(lang) ? lang : "es");
}

/**
 * Names the organisation four digits belong to, for the signup form to show
 * before the learner commits.
 *
 * Returns only the name. The codes are guessable by design, so this reveals
 * nothing that walking the range would not, but there is still no reason to
 * hand out ids.
 */
export async function lookupJoinCode(
  code: string,
): Promise<{ name: string } | null> {
  const target = await orgForSignup(code);
  return target.ok && !target.demo ? { name: target.org.name } : null;
}

export async function createLearnerAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const lang = String(formData.get("lang") ?? "es");
  const d = dict(lang);

  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: d.signupBadFields };

  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const problem = passwordProblem({
    role: "LEARNER",
    password: pin,
    confirm,
    email: parsed.data.email,
  });
  if (problem) return { error: passwordMessage(problem, isLang(lang) ? lang : "es") };

  // Resolved from the submitted code, never from an id in the form: otherwise a
  // crafted post could place someone in an organisation they have no code for,
  // or one that has been deactivated.
  const target = await orgForSignup(String(formData.get("code") ?? ""));
  if (!target.ok) {
    return { error: target.reason === "badCode" ? d.signupCodeBad : d.signupNoDemo };
  }

  const email = normalizeEmail(parsed.data.email);
  const orgId = target.org.id;

  let userId: string;
  try {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(pin),
        name: parsed.data.name,
        role: "LEARNER",
        uiLang: isLang(lang) ? lang : "es",
        orgId,
        // They chose this PIN themselves, so there is nothing to force.
        mustChangePassword: false,
        learner: {
          create: {
            orgId,
            // A full cycle on the house, matching the admin invite path.
            billingStatus: "TRIAL",
            paidThrough: initialPaidThrough(),
          },
        },
      },
      select: { id: true, role: true, orgId: true, uiLang: true },
    });
    userId = created.id;
    await startSession(created);
  } catch (error) {
    // Unlike the admin invite, this endpoint is public, so the gap between
    // "does this email exist" and "create it" is a race worth losing safely.
    // P2002 is the unique index on User.email doing its job.
    if (isUniqueViolation(error)) {
      return { error: d.signupTaken };
    }
    throw error;
  }

  // So the organisation's admin console shows them without a manual refresh.
  revalidatePath("/admin", "layout");
  revalidatePath("/super", "layout");

  // Outside the try: redirect works by throwing, and a catch would swallow it.
  if (userId) redirect("/path");
  return {};
}
