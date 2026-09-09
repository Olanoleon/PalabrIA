"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  RESET_TTL_MIN,
  TWO_FACTOR_TTL_MIN,
  clearPending,
  consumeOneTime,
  endSession,
  getPendingUserId,
  getSession,
  hashPassword,
  isAdmin,
  issueOneTime,
  normalizeEmail,
  startPending,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { homeFor } from "@/lib/rbac";
import { ENFORCE_PASSWORD_CHANGE } from "@/lib/config";
import { passwordProblem } from "@/lib/password";
import { passwordMessage } from "@/lib/password-message";
import { sendPasswordReset, sendTwoFactorCode } from "@/lib/resend";
import { isLang, t, type Lang } from "@/lib/i18n";

export type FormState = { error?: string; notice?: string };

function langOf(formData: FormData): Lang {
  const raw = String(formData.get("lang") ?? "es");
  return isLang(raw) ? raw : "es";
}

function dict(lang: string) {
  return t((lang === "en" ? "en" : "es") as Lang);
}

async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

/** How many failures in a row before it is worth a line in the logs. */
const NOTEWORTHY_FAILURES = 10;

/**
 * Records a wrong password. Never blocks the next attempt.
 *
 * A learner's credential is four digits, so a run of failures is worth being
 * able to see; locking the account is not, because there is nothing sensitive
 * behind it and a locked-out learner is a support message. The warning lands in
 * the same server log as the `[openai]` usage lines.
 */
async function noteFailedSignIn(id: string, email: string, before: number) {
  const failedSignIns = before + 1;
  await prisma.user.update({
    where: { id },
    data: { failedSignIns, lastFailedSignInAt: new Date() },
  });
  if (failedSignIns === NOTEWORTHY_FAILURES) {
    console.warn(
      `[auth] ${failedSignIns} consecutive failed sign-ins for ${email}`,
    );
  }
}

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const lang = String(formData.get("lang") ?? "es");
  const d = dict(lang);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: d.signinMissing };

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message and comparable timing for "no such user" and "wrong password":
  // the form must not tell a stranger which emails exist.
  if (!user) {
    await verifyPassword(password, "$2a$12$".padEnd(60, "x"));
    return { error: d.signinBadCreds };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    await noteFailedSignIn(user.id, user.email, user.failedSignIns);
    return { error: d.signinBadCreds };
  }
  if (!user.isActive) return { error: d.signinInactive };

  // Admins get a second factor; learners do not (PRD).
  if (isAdmin(user.role)) {
    const code = await issueOneTime(user.id, "TWO_FACTOR", TWO_FACTOR_TTL_MIN);
    const sent = await sendTwoFactorCode(user.email, code, TWO_FACTOR_TTL_MIN);
    if (!sent) {
      // Without email there is no way to deliver the factor. Say so rather than
      // stranding the admin on a code screen that can never be satisfied.
      console.warn(`[auth] 2FA code for ${user.email}: ${code}`);
      if (process.env.NODE_ENV === "production") {
        return { error: "No pudimos enviar el código. Revisa la configuración de correo." };
      }
    }
    await startPending(user.id);
    redirect("/verify-2fa");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedSignIns: 0, lastFailedSignInAt: null },
  });
  await startSession(user);
  redirect(
    ENFORCE_PASSWORD_CHANGE && user.mustChangePassword
      ? "/new-password"
      : homeFor(user.role),
  );
}

export async function verifyTwoFactor(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const d = dict(String(formData.get("lang") ?? "es"));
  const userId = await getPendingUserId();
  if (!userId) redirect("/signin");

  const code = String(formData.get("code") ?? "").trim();
  const result = await consumeOneTime("TWO_FACTOR", code, userId);
  if (!result.ok) return { error: d.twoFaBad };

  const user = await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
  await clearPending();
  await startSession(user);
  redirect(
    ENFORCE_PASSWORD_CHANGE && user.mustChangePassword
      ? "/new-password"
      : homeFor(user.role),
  );
}

export async function resendTwoFactor(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const d = dict(String(formData.get("lang") ?? "es"));
  const userId = await getPendingUserId();
  if (!userId) redirect("/signin");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const code = await issueOneTime(user.id, "TWO_FACTOR", TWO_FACTOR_TTL_MIN);
  const sent = await sendTwoFactorCode(user.email, code, TWO_FACTOR_TTL_MIN);
  if (!sent) console.warn(`[auth] 2FA code for ${user.email}: ${code}`);
  return { notice: d.twoFaSent };
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const d = dict(String(formData.get("lang") ?? "es"));
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;

  if (user?.isActive) {
    const token = await issueOneTime(user.id, "PASSWORD_RESET", RESET_TTL_MIN);
    const url = `${await appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const sent = await sendPasswordReset(user.email, url, RESET_TTL_MIN);
    if (!sent) console.warn(`[auth] reset link for ${user.email}: ${url}`);
  }
  // Always the same answer, whether or not the address exists.
  return { notice: d.forgotToast };
}

export async function changePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const lang = langOf(formData);
  const session = await getSession();
  if (!session) redirect("/signin");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.uid } });

  const problem = passwordProblem({
    role: user.role,
    password,
    confirm,
    email: user.email,
  });
  if (problem) return { error: passwordMessage(problem, lang) };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: false },
  });
  redirect(homeFor(user.role));
}

export async function resetPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const lang = langOf(formData);
  const d = dict(lang);
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Which rule applies depends on the role, and the role is only known once the
  // token is consumed — but consuming burns a single-use link, so a typo must
  // not reach that point. Check what can be checked without knowing the role
  // first: the confirmation, and whether the input could satisfy *either* rule.
  // That catches every ordinary mistake. The remaining cases (a learner typing
  // a long password, an admin typing four digits) still cost a fresh link.
  if (password !== confirm) return { error: d.newPwMismatch };
  if (!/^\d{4}$/.test(password) && password.length < 8) {
    return { error: d.newPwShort };
  }

  const result = await consumeOneTime("PASSWORD_RESET", token);
  if (!result.ok) return { error: d.resetBadLink };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: result.userId },
  });
  const problem = passwordProblem({
    role: user.role,
    password,
    confirm,
    email: user.email,
  });
  if (problem) return { error: passwordMessage(problem, lang) };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: false },
  });
  await startSession(user);
  redirect(homeFor(user.role));
}

export async function signOut() {
  await endSession();
  redirect("/login");
}
