"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, startSession } from "@/lib/auth";
import { isLang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/lang";

/**
 * Switches the UI language. Persists on the user record so the choice follows
 * them to another device, and re-signs the session cookie so the very next
 * render already reads the new language.
 */
export async function setLanguage(value: string) {
  if (!isLang(value)) return;

  (await cookies()).set(LANG_COOKIE, value, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const session = await getSession();
  if (session) {
    const user = await prisma.user.update({
      where: { id: session.uid },
      data: { uiLang: value },
      select: { id: true, role: true, orgId: true, uiLang: true },
    });
    await startSession(user);
  }
  revalidatePath("/", "layout");
}
