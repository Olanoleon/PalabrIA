import { redirect } from "next/navigation";
import { getPendingUserId } from "@/lib/auth";
import { currentDict } from "@/lib/lang";
import { TwoFactorForm } from "./form";

/** Second factor for administrators (PRD: admins use a code emailed by Resend). */
export default async function VerifyTwoFactorPage() {
  const pending = await getPendingUserId();
  if (!pending) redirect("/login");
  const { lang, d } = await currentDict();

  return (
    <div className="flex flex-1 flex-col justify-center px-[18px] pb-10">
      <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.035em]">
        {d.twoFaTitle}
      </h1>
      <p className="mt-2 text-[14px] leading-[1.5] text-body">{d.twoFaSub}</p>
      <div className="mt-5">
        <TwoFactorForm lang={lang} />
      </div>
    </div>
  );
}
