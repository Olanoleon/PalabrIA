"use client";

import { useState, useTransition } from "react";
import { declareMyPayment } from "@/lib/actions/payments";
import { t, type Lang } from "@/lib/i18n";

export function DeclarePayment({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="animate-rise rounded-2xl border-2 border-ink bg-pass-soft px-4 py-3 text-[12.5px] font-semibold leading-[1.45] text-pass-deep">
        {d.payDeclared}
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        start(async () => {
          await declareMyPayment(formData);
          setDone(true);
        })
      }
      className="flex flex-col gap-[9px]"
    >
      <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
        {d.payDeclareSub}
      </label>
      <input
        name="reference"
        maxLength={64}
        placeholder="BRE-0000"
        className="w-full rounded-2xl border-2 border-ink bg-surface px-[15px] py-3 text-[14px] font-medium outline-none flat-2 placeholder:text-muted-3 focus:border-brand"
      />
      <button
        type="submit"
        disabled={pending}
        className="press rounded-2xl border-2 border-ink bg-brand py-[14px] text-center font-display text-[16.5px] font-bold text-white hard-2 disabled:opacity-60"
      >
        {d.payDeclareCta}
      </button>
    </form>
  );
}
