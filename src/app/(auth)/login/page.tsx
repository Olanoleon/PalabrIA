import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";
import { currentDict } from "@/lib/lang";
import { HelpIcon, CheckIcon } from "@/components/ui/icons";
import { SignInForm } from "./signin-form";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));

  const { lang, d } = await currentDict();

  return (
    <>
        <div className="flex flex-1 flex-col px-[18px] pt-2">
          {/* Decorative word cards — the same two the design floats here. */}
          <div className="relative h-[196px] shrink-0" aria-hidden="true">
            <div className="absolute left-[14px] top-[34px] w-[118px] -rotate-[7deg] rounded-2xl border-2 border-ink bg-surface p-3 flat-2">
              <div className="font-display text-[17px] font-semibold tracking-[-0.02em]">
                shoulder
              </div>
              <div className="mt-[2px] font-mono text-[11px] text-muted">
                /ˈʃoʊl.dɚ/
              </div>
              <div className="mt-2 h-[6px] w-[52px] rounded-full bg-brand-mid" />
            </div>
            <div className="absolute right-2 top-3 w-[126px] rotate-[6deg] rounded-2xl border-2 border-ink bg-cream p-3 flat-2">
              <div className="font-display text-[17px] font-semibold tracking-[-0.02em]">
                eyebrow
              </div>
              <div className="mt-[2px] font-mono text-[11px] text-muted">
                /ˈaɪ.braʊ/
              </div>
              <div className="mt-2 h-[6px] w-16 rounded-full bg-[#86EFAC]" />
            </div>
            <div className="absolute bottom-0 left-16 flex animate-nudge items-center gap-[9px] rounded-full border-2 border-ink bg-brand py-[9px] pl-[9px] pr-[13px] text-[12.5px] font-bold text-brand-ink flat-2">
              <span className="grid size-[26px] place-items-center rounded-full border-2 border-ink bg-brand-ink text-brand">
                <CheckIcon size={12} />
              </span>
              {d.signinChip}
            </div>
          </div>

          <h1 className="mt-[14px] font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] text-pretty">
            {d.signinTitle}
          </h1>
          <p className="mt-2 text-[14px] leading-[1.5] text-body text-pretty">
            {d.signinSub}
          </p>

          <div className="mt-[18px]">
            <SignInForm lang={lang} />
          </div>

          <div className="my-4 flex items-center gap-[9px] rounded-2xl border-2 border-dashed border-ink bg-cream px-[13px] py-3">
            <HelpIcon className="shrink-0 text-brand-deep" />
            <p className="text-[12px] leading-[1.45] text-body [overflow-wrap:anywhere]">
              {d.signinNote}
            </p>
          </div>
        </div>

        <p className="px-[18px] pb-4 text-center text-[11px] leading-[1.45] text-muted">
          {d.signinLegal}
        </p>
    </>
  );
}
