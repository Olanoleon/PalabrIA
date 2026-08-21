"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/primitives";

const INPUT =
  "w-full rounded-2xl border-2 border-ink bg-surface px-[15px] py-[14px] text-[15px] font-medium text-ink outline-none flat-2 placeholder:text-muted-3 focus:border-brand";

export function TextField({
  label,
  className,
  ...rest
}: ComponentProps<"input"> & { label?: string }) {
  return (
    <div className="flex flex-col gap-[9px]">
      {label ? <Label>{label}</Label> : null}
      <input {...rest} className={cn(INPUT, className)} />
    </div>
  );
}

/** Password field with the design's Ver/Ocultar pill inside the input. */
export function PasswordField({
  label,
  showLabel,
  hideLabel,
  className,
  ...rest
}: ComponentProps<"input"> & {
  label?: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-[9px]">
      {label ? <Label>{label}</Label> : null}
      <div className="relative">
        <input
          {...rest}
          type={shown ? "text" : "password"}
          className={cn(INPUT, "pr-[86px]", className)}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="absolute right-[11px] top-[11px] rounded-full border-[1.5px] border-ink bg-brand-soft px-[9px] py-[5px] text-[10.5px] font-bold text-ink"
        >
          {shown ? hideLabel : showLabel}
        </button>
      </div>
    </div>
  );
}
