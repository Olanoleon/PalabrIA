import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";
import { currentDict } from "@/lib/lang";
import { NewPasswordForm } from "./form";

/**
 * Forced first-login password change. The PRD sets the initial password to the
 * learner's own email, which must not stay in place.
 */
export default async function NewPasswordPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect(homeFor(user.role));

  const { lang, d } = await currentDict();

  return (
    <div className="flex flex-1 flex-col justify-center px-[18px] pb-10">
      <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.035em]">
        {d.newPwTitle}
      </h1>
      <p className="mt-2 text-[14px] leading-[1.5] text-body">{d.newPwSub}</p>
      <p className="mt-1 font-mono text-[12.5px] text-muted">{user.email}</p>
      <div className="mt-5">
        <NewPasswordForm lang={lang} />
      </div>
    </div>
  );
}
