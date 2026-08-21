import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";
import { ENFORCE_PASSWORD_CHANGE } from "@/lib/config";
import { currentDict } from "@/lib/lang";
import { NewPasswordForm } from "./form";

/**
 * Forced first-login password change. The PRD sets the initial password to the
 * learner's own email, which must not stay in place.
 */
export default async function NewPasswordPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  // Reachable on purpose even when nothing forces it: a user may choose to
  // replace a default password. Only bounce if there is nothing to change.
  if (!user.mustChangePassword && !ENFORCE_PASSWORD_CHANGE) {
    redirect(homeFor(user.role));
  }

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
