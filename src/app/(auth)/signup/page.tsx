import { TRIAL_DAYS } from "@/lib/billing-rules";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";
import { currentDict } from "@/lib/lang";
import { demoOrg } from "@/lib/public-data";
import { SignupForm } from "./signup-form";

/**
 * Open registration. An empty code field means the demo organisation, which is
 * how someone with no invitation gets to try the app at all.
 */
export default async function SignupPage() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));

  const { lang, d } = await currentDict();
  const demo = await demoOrg();

  return (
    <>
      <div className="flex flex-1 flex-col px-[18px] pt-6">
        <h1 className="font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.035em] text-pretty">
          {d.signupTitle}
        </h1>
        <p className="mt-2 text-[14px] leading-[1.5] text-body text-pretty">
          {d.signupSub(TRIAL_DAYS)}
        </p>

        <div className="mt-[18px]">
          <SignupForm lang={lang} demoOrgName={demo?.name ?? null} />
        </div>
      </div>

      <p className="px-[18px] pb-4 pt-4 text-center text-[11px] leading-[1.45] text-muted">
        {d.signupLegal}
      </p>
    </>
  );
}
