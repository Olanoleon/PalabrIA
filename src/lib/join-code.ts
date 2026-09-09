import type { PrismaClient } from "@/generated/prisma";

/**
 * The four digits a learner types to join an organisation.
 *
 * Lives here rather than beside `createOrganization` because organisations are
 * created in five places — the console, three seed scripts, and the content
 * promoter — and an organisation without a code is one nobody can join. A
 * `"use server"` module may only export async functions, so the console cannot
 * be the home for something the scripts also need.
 */

/** Inclusive range. Four digits, never leading-zero, so it reads as a code. */
const LOW = 1000;
const HIGH = 9999;

/** Enough tries that exhaustion means the space really is full. */
const ATTEMPTS = 50;

type OrgClient = Pick<PrismaClient, "organization">;

/**
 * Finds a code nobody is using.
 *
 * Probes rather than trusting randomness: the space is only 9,000 wide, so
 * collisions are a matter of when, and the unique index would turn one into a
 * failed organisation creation. Gives up loudly rather than looping forever.
 */
export async function freeJoinCode(db: OrgClient): Promise<string> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const code = String(LOW + Math.floor(Math.random() * (HIGH - LOW + 1)));
    const taken = await db.organization.findUnique({
      where: { joinCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error(
    `No free join code after ${ATTEMPTS} attempts; the 4-digit space is full.`,
  );
}
