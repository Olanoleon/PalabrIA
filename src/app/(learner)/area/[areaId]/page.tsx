import { notFound } from "next/navigation";
import { areaDetail, learnerContext } from "@/lib/learner-data";
import { UnitTimeline } from "@/components/learner/unit-timeline";
import { IconButtonLink } from "@/components/ui/primitives";
import { ChevronLeft } from "@/components/ui/icons";

export default async function AreaPage({ params }: PageProps<"/area/[areaId]">) {
  const { areaId } = await params;
  const { learner, lang, d } = await learnerContext({ requireAccess: true });
  const area = await areaDetail(learner.orgId, learner.id, areaId);
  if (!area) notFound();

  const metaLine =
    (lang === "es" && area.nameEs ? `${area.nameEs} · ` : "") +
    `${d.unitsOf(area.doneUnits, area.totalUnits)} · ${area.totalWords} ${d.words}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="flex flex-col gap-3 border-b-2 border-ink px-[18px] pb-3 pt-4"
        style={{ background: area.complete ? "#E3F0E8" : area.tint }}
      >
        <div className="flex items-center gap-3">
          <IconButtonLink href="/path" aria-label={d.backPath}>
            <ChevronLeft />
          </IconButtonLink>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
            {d.areaWord} {String(area.sortOrder + 1).padStart(2, "0")}
          </span>
        </div>
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em]">
            {area.name}
          </h1>
          <p className="mt-1 text-[12.5px] font-medium text-body">{metaLine}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-[18px] pb-6 pt-[14px]">
        <UnitTimeline
          units={area.units}
          lang={lang}
          blockingNumber={area.blockingNumber}
        />
      </div>
    </div>
  );
}
