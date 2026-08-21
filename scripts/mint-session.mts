/**
 * Prints a signed session cookie for a seeded user, so pages can be fetched
 * with curl without driving the sign-in form:
 *
 *   TOKEN=$(npm run -s session ana.rueda@arkusnexus.com)
 *   curl -H "Cookie: pal_session=$TOKEN" http://localhost:3000/path
 *
 * Development only — it mints a session without a password.
 */
import "dotenv/config";
import { SignJWT } from "jose";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();
const user = await prisma.user.findUniqueOrThrow({ where: { email: process.argv[2] } });
const token = await new SignJWT({ uid: user.id, role: user.role, orgId: user.orgId, lang: user.uiLang })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1d")
  .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
console.log(token);
await prisma.$disconnect();
