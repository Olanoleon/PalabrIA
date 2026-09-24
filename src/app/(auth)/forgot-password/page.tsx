import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";
import { currentDict } from "@/lib/lang";
import { HelpIcon } from "@/components/ui/icons";
import { ForgotForm } from "./forgot-form";

/**
 * Asking for a reset link, on its own screen.
 *
 * It used to be a second form hidden inside the sign-in page, sharing that
 * page's email field — so "forgot your password?" acted on whatever happened
 * to be typed above it, with nothing to confirm what address it had used.
 */
export default async function ForgotPasswordPage() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));

  const { lang, d } = await currentDict();

  return (
    <>
      <div className="flex flex-1 flex-col px-[18px] pt-6">
        <h1 className="font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.035em] text-pretty">
          {d.forgotTitle}
        </h1>
        <p className="mt-2 text-[14px] leading-[1.5] text-body text-pretty">
          {d.forgotSub}
        </p>

        <div className="mt-[18px]">
          <ForgotForm lang={lang} />
        </div>

        <div className="my-4 flex items-center gap-[9px] rounded-2xl border-2 border-dashed border-ink bg-cream px-[13px] py-3">
          <HelpIcon className="shrink-0 text-brand-deep" />
          <p className="text-[12px] leading-[1.45] text-body [overflow-wrap:anywhere]">
            {d.forgotSpamNote}
          </p>
        </div>

        <Link
          href="/signin"
          className="self-center text-[12.5px] font-bold text-brand-deep underline underline-offset-[3px]"
        >
          {d.forgotBack}
        </Link>
      </div>
    </>
  );
}
