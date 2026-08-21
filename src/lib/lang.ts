/**
 * UI language resolution.
 *
 * Signed-in users carry it on their record (`User.uiLang`); before sign-in it
 * lives in a cookie so the toggle on the sign-in screen still works. Both are
 * kept in step whenever the toggle is used.
 */
import "server-only";
import { cookies } from "next/headers";
import { isLang, t, type Lang, type Translated } from "@/lib/i18n";
import { getSession } from "@/lib/auth";

export const LANG_COOKIE = "pal_lang";

export async function currentLang(): Promise<Lang> {
  const session = await getSession();
  if (session) return session.lang;
  const cookie = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(cookie) ? cookie : "es";
}

export async function currentDict(): Promise<{ lang: Lang; d: Translated }> {
  const lang = await currentLang();
  return { lang, d: t(lang) };
}
