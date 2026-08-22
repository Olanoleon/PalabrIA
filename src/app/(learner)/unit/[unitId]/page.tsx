import { notFound, redirect } from "next/navigation";
import { learnerContext, unitDetail } from "@/lib/learner-data";
import { UnitView } from "@/components/learner/unit-view";

export default async function UnitPage({ params }: PageProps<"/unit/[unitId]">) {
  const { unitId } = await params;
  const { learner, lang } = await learnerContext({ requireAccess: true });
  const unit = await unitDetail(learner.orgId, learner.id, unitId);
  if (!unit) notFound();
  // A learner who guesses a locked unit's URL is sent back to its area rather
  // than shown content the path has not opened yet.
  if (unit.locked) redirect(`/area/${unit.areaId}`);

  return (
    <UnitView
      unit={unit}
      lang={lang}
      onboardingSteps={learner.onboardingSteps}
    />
  );
}
