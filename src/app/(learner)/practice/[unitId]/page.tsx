import { notFound, redirect } from "next/navigation";
import { learnerContext, practiceQuestions, unitDetail } from "@/lib/learner-data";
import { PracticeView } from "@/components/learner/practice-view";

export default async function PracticePage({
  params,
}: PageProps<"/practice/[unitId]">) {
  const { unitId } = await params;
  const { learner, lang } = await learnerContext({ requireAccess: true });
  const unit = await unitDetail(learner.orgId, learner.id, unitId);
  if (!unit) notFound();
  if (unit.locked) redirect(`/area/${unit.areaId}`);

  const questions = await practiceQuestions(unitId);

  return (
    <PracticeView
      unitId={unit.id}
      unitName={unit.areaName}
      areaId={unit.areaId}
      questions={questions}
      lang={lang}
    />
  );
}
