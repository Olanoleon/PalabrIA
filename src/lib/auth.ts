/**
 * Sessions, passwords and one-time codes.
 *
 * Own implementation on purpose: the PRD requires email + password where the
 * initial password is the email itself, which no hosted auth provider models
 * cleanly. The session is a jose-signed JWT in an httpOnly cookie.
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { isLang, type Lang } from "@/lib/i18n";
import type { Role, TokenPurpose } from "@/generated/prisma";

const SESSION_COOKIE = "pal_session";
const PENDING_COOKIE = "pal_2fa";
const SESSION_DAYS = 30;

export const TWO_FACTOR_TTL_MIN = 10;
export const RESET_TTL_MIN = 15;
export const MAX_CODE_ATTEMPTS = 5;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  uid: string;
  role: Role;
  orgId: string | null;
  lang: Lang;
};

// ── Passwords ───────────────────────────────────────────────────────────────

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Normalized form used as both the login key and the initial password. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ── Session cookies ─────────────────────────────────────────────────────────

async function sign(payload: Record<string, unknown>, days: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function startSession(user: {
  id: string;
  role: Role;
  orgId: string | null;
  uiLang: Lang;
}) {
  const token = await sign(
    { uid: user.id, role: user.role, orgId: user.orgId, lang: user.uiLang },
    SESSION_DAYS,
  );
  (await cookies()).set(
    SESSION_COOKIE,
    token,
    cookieOptions(SESSION_DAYS * 24 * 60 * 60),
  );
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING_COOKIE);
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const lang = isLang(payload.lang) ? payload.lang : "es";
    if (typeof payload.uid !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      uid: payload.uid,
      role: payload.role as Role,
      orgId: typeof payload.orgId === "string" ? payload.orgId : null,
      lang,
    };
  } catch {
    return null;
  }
});

/** The half-authenticated state between password and 2FA code. */
export async function startPending(userId: string) {
  const token = await sign({ uid: userId, pending: true }, 1);
  (await cookies()).set(PENDING_COOKIE, token, cookieOptions(15 * 60));
}

export async function getPendingUserId(): Promise<string | null> {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.pending === true && typeof payload.uid === "string"
      ? payload.uid
      : null;
  } catch {
    return null;
  }
}

export async function clearPending() {
  (await cookies()).delete(PENDING_COOKIE);
}

// ── Current user ────────────────────────────────────────────────────────────

/**
 * Loads the signed-in user from the database. Always prefer this over the
 * cookie payload for authorization: a role change or deactivation must take
 * effect before the 30-day cookie expires.
 */
/**
 * Loads the signed-in user from the database, once per request.
 *
 * Memoized with React's `cache`: the learner layout, the page and the data
 * layer all need the same record, and re-querying it three times per render is
 * both wasteful and — under some driver builds — flaky.
 *
 * Always prefer this over the cookie payload for authorization: a role change
 * or a deactivation must take effect before the 30-day cookie expires.
 */
export const currentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    include: { learner: true, org: true },
  });
  if (!user || !user.isActive) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export function isAdmin(role: Role): boolean {
  return role === "ORG_ADMIN" || role === "SUPER_ADMIN";
}

// ── One-time codes (2FA and password reset) ─────────────────────────────────

/** Six digits, uniformly distributed, from the platform CSPRNG. */
export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Issues a one-time credential, invalidating any earlier unused one for the
 * same purpose so a resend cannot leave two live codes behind.
 */
export async function issueOneTime(
  userId: string,
  purpose: TokenPurpose,
  ttlMinutes: number,
): Promise<string> {
  const raw = purpose === "TWO_FACTOR" ? generateCode() : generateToken();
  await prisma.authToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.authToken.create({
    data: {
      userId,
      purpose,
      codeHash: await bcrypt.hash(raw, 10),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    },
  });
  return raw;
}

export type OneTimeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "throttled" };

export async function consumeOneTime(
  purpose: TokenPurpose,
  raw: string,
  userId?: string,
): Promise<OneTimeResult> {
  const candidates = await prisma.authToken.findMany({
    where: { purpose, usedAt: null, ...(userId ? { userId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  for (const token of candidates) {
    if (token.attempts >= MAX_CODE_ATTEMPTS) continue;
    if (!(await bcrypt.compare(raw, token.codeHash))) {
      await prisma.authToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      continue;
    }
    if (token.expiresAt.getTime() < Date.now()) {
      await prisma.authToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
      return { ok: false, reason: "expired" };
    }
    await prisma.authToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    return { ok: true, userId: token.userId };
  }
  return { ok: false, reason: "invalid" };
}
