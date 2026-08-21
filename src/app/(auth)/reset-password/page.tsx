import Link from "next/link";
import { currentDict } from "@/lib/lang";
import { ResetPasswordForm } from "./form";

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const { lang, d } = await currentDict();
  const value = typeof token === "string" ? token : "";

  return (
    <div className="flex flex-1 flex-col justify-center px-[18px] pb-10">
      <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.035em]">
        {d.resetTitle}
      </h1>
      <p className="mt-2 text-[14px] leading-[1.5] text-body">{d.resetSub}</p>
      <div className="mt-5">
        {value ? (
          <ResetPasswordForm lang={lang} token={value} />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="rounded-2xl border-2 border-dashed border-ink bg-cream px-4 py-3 text-[12.5px]">
              {d.resetBadLink}
            </p>
            <Link
              href="/login"
              className="press rounded-2xl border-2 border-ink bg-surface py-3 text-center text-[14px] font-bold hard-1"
            >
              {d.signinCta}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
