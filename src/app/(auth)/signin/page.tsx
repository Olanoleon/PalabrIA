import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";
import { currentDict } from "@/lib/lang";
import { HelpIcon } from "@/components/ui/icons";
import { SignInForm } from "./signin-form";

/**
 * The sign-in form, for someone who already has an account.
 *
 * The marketing hero that used to sit above it now lives on /login, which is
 * the choice between registering and signing in. This screen is what every
 * "you need to be signed in" redirect points at, so it stays deliberately
 * plain — nobody arriving here needs to be sold the product again.
 */
export default async function SignInPage() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));

  const { lang, d } = await currentDict();

  return (
    <>
      <div className="flex flex-1 flex-col px-[18px] pt-6">
        <h1 className="font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.035em] text-pretty">
          {d.signinCta}
        </h1>

        <div className="mt-[18px]">
          <SignInForm lang={lang} />
        </div>

        <div className="my-4 flex items-center gap-[9px] rounded-2xl border-2 border-dashed border-ink bg-cream px-[13px] py-3">
          <HelpIcon className="shrink-0 text-brand-deep" />
          <p className="text-[12px] leading-[1.45] text-body [overflow-wrap:anywhere]">
            {d.signinNote}
          </p>
        </div>

        <Link
          href="/signup"
          className="self-center text-[12.5px] font-bold text-brand-deep underline underline-offset-[3px]"
        >
          {d.registerCta}
        </Link>
      </div>

      <p className="px-[18px] pb-4 text-center text-[11px] leading-[1.45] text-muted">
        {d.signinLegal}
      </p>
    </>
  );
}
