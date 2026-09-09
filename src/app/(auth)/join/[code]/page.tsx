import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";
import { currentDict } from "@/lib/lang";
import { demoOrg, normalizeJoinCode, orgByJoinCode } from "@/lib/public-data";
import { SignupForm } from "../../signup/signup-form";

/**
 * An organisation's invite link.
 *
 * The same registration form as /signup, with the code already filled in and
 * the organisation named — so the person following the link can see where they
 * are about to land. A code that matches nothing says so and offers the demo
 * instead, rather than silently dropping them somewhere they did not choose.
 */
export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));

  const { code } = await params;
  const { lang, d } = await currentDict();
  const clean = normalizeJoinCode(code);
  const org = clean ? await orgByJoinCode(clean) : null;

  if (!org) {
    const demo = await demoOrg();
    return (
      <div className="flex flex-1 flex-col justify-center gap-4 px-[18px] pb-10 text-center">
        <h1 className="font-display text-[24px] font-semibold tracking-[-0.03em]">
          {d.joinBadCode}
        </h1>
        {demo ? (
          <Link
            href="/signup"
            className="press mx-auto rounded-2xl border-2 border-ink bg-brand px-5 py-3 font-display text-[15px] font-bold text-brand-ink hard-2"
          >
            {d.joinTryDemo}
          </Link>
        ) : null}
        <Link
          href="/signin"
          className="text-[12.5px] font-bold text-brand-deep underline underline-offset-[3px]"
        >
          {d.signupHaveAccount}
        </Link>
      </div>
    );
  }

  const demo = await demoOrg();

  return (
    <>
      <div className="flex flex-1 flex-col px-[18px] pt-6">
        <h1 className="font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.035em] text-pretty">
          {d.signupTitle}
        </h1>
        <p className="mt-2 text-[14px] leading-[1.5] text-body text-pretty">
          {d.signupSub}
        </p>

        <div className="mt-[18px]">
          <SignupForm
            lang={lang}
            initialCode={clean ?? ""}
            initialOrgName={org.name}
            demoOrgName={demo?.name ?? null}
          />
        </div>
      </div>

      <p className="px-[18px] pb-4 pt-4 text-center text-[11px] leading-[1.45] text-muted">
        {d.signupLegal}
      </p>
    </>
  );
}
