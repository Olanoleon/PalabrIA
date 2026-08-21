import { cn } from "@/lib/cn";

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[18px] border-2 border-ink bg-surface p-4 flat-2 sm:p-5",
        className,
      )}
    >
      {title ? (
        <header className="mb-4 flex flex-wrap items-baseline gap-3">
          <h2 className="font-display text-[17px] font-semibold tracking-[-0.02em]">
            {title}
          </h2>
          {description ? (
            <p className="text-[12.5px] text-muted-2">{description}</p>
          ) : null}
          {actions ? <div className="ml-auto flex gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function StatTile({
  value,
  label,
  hint,
  tone = "paper",
}: {
  value: string | number;
  label: string;
  hint?: string;
  tone?: "paper" | "soft" | "pass" | "warn";
}) {
  const tones = {
    paper: "bg-surface",
    soft: "bg-brand-soft",
    pass: "bg-pass-soft",
    warn: "bg-cream",
  };
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-ink p-4 flat-1",
        tones[tone],
      )}
    >
      <div className="font-display text-[26px] font-bold tracking-[-0.03em]">
        {value}
      </div>
      <div className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </div>
      {hint ? <div className="mt-1 text-[11.5px] text-muted-2">{hint}</div> : null}
    </div>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "pass" | "warn" | "danger" | "brand";
}) {
  const tones = {
    neutral: "border-muted-line bg-locked text-muted-2",
    pass: "border-pass bg-pass-soft text-pass-deep",
    warn: "border-brand bg-brand-soft text-brand-dark",
    danger: "border-ink bg-ink text-paper",
    brand: "border-ink bg-brand text-brand-ink",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] px-[9px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.06em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Tables scroll inside their own box so the page never scrolls sideways. */
export function TableScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b-2 border-rule pb-2 pr-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-rule py-3 pr-3 align-middle", className)}>
      {children}
    </td>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border-2 border-dashed border-ink bg-cream px-4 py-5 text-center text-[13px] text-body">
      {children}
    </p>
  );
}
