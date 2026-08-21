import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";
import { ProgressRing } from "@/components/ui/primitives";
import type { AreaCardData } from "@/lib/learner-data";
import { t, type Lang } from "@/lib/i18n";

export function AreaCard({
  area,
  lang,
  index,
}: {
  area: AreaCardData;
  lang: Lang;
  index: number;
}) {
  const d = t(lang);
  const suffix = lang === "es" && area.nameEs ? ` · ${area.nameEs}` : "";
  const meta = area.complete
    ? d.areaComplete + suffix
    : area.doneUnits === 0
      ? d.startHere + suffix
      : d.unitOpen(area.doneUnits + 1) + suffix;

  return (
    <Link
      href={`/area/${area.id}`}
      className="press relative flex items-center gap-[14px] rounded-[18px] border-2 border-ink p-[15px] flat-2 hover:-translate-x-px hover:-translate-y-px"
      style={{ background: area.complete ? "#E3F0E8" : area.tint }}
    >
      <ProgressRing
        size={52}
        stroke={5}
        progress={area.progress}
        color={area.complete ? "#15803D" : "#EA580C"}
      >
        <span className="text-[12px] font-bold">
          {area.doneUnits}/{area.totalUnits}
        </span>
      </ProgressRing>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
          {d.areaWord} {String(index + 1).padStart(2, "0")}
        </div>
        <div className="font-display text-[18px] font-semibold leading-[1.15] tracking-[-0.02em]">
          {area.name}
        </div>
        <div className="text-[11.5px] text-muted-2">{meta}</div>
        {area.updatedUnits > 0 ? (
          <div className="mt-[2px] inline-flex w-fit items-center gap-[5px] rounded-full border-[1.5px] border-brand bg-brand-soft px-[8px] py-[2px] text-[10.5px] font-bold text-brand-dark">
            {d.updatedAreaNote(area.updatedUnits)}
          </div>
        ) : null}
      </div>
      <ChevronRight size={15} className="text-ink" />
    </Link>
  );
}
