"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { t, type Lang } from "@/lib/i18n";
import { SpeakerIcon } from "@/components/ui/icons";
import { Waveform } from "@/components/learner/waveform";
import { useSpeech } from "@/lib/use-speech";
import { checkAnswer, submitPractice, type CheckResult } from "@/lib/actions/practice";
import type { PracticeQuestion } from "@/lib/learner-data";
import type { ResultSummary } from "@/lib/progress";
import { ResultView } from "@/components/learner/result-view";

/** Deterministic shuffle so the letter bank does not reorder between renders. */
function shuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = (i * 7 + seed * 13 + 3) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const FILLER_LETTERS = ["e", "r", "s", "t", "h", "a", "n", "o"];

type Answer = { optionText?: string; typed?: string };

export function PracticeView({
  unitId,
  unitName,
  areaId,
  questions,
  lang,
}: {
  unitId: string;
  unitName: string;
  areaId: string;
  questions: PracticeQuestion[];
  lang: Lang;
}) {
  const d = t(lang);
  const router = useRouter();
  const { speak, speaking } = useSpeech();
  const [pending, startTransition] = useTransition();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<CheckResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<ResultSummary | null>(null);

  const question = questions[index];
  const typing = question?.type === "TYPE_WHAT_YOU_HEAR";

  const kicker = useMemo(() => {
    if (!question) return "";
    if (question.type === "FILL_BLANK") return d.kickerBlank;
    if (question.type === "IPA_MATCH") return d.kickerIpa;
    return d.kickerAudio;
  }, [question, d]);

  const bank = useMemo(() => {
    if (!question?.word) return [];
    const letters = question.word.toLowerCase().split("");
    const extra = FILLER_LETTERS.filter((l) => !letters.includes(l)).slice(
      0,
      Math.max(3, 9 - letters.length),
    );
    return shuffle(letters.concat(extra), letters.length);
  }, [question]);

  if (result) {
    return (
      <ResultView
        result={result}
        lang={lang}
        areaId={areaId}
        unitId={unitId}
        unitName={unitName}
        onRetry={() => {
          setResult(null);
          setIndex(0);
          setAnswers({});
          setPicked(null);
          setTyped("");
          setFeedback(null);
          setCorrectCount(0);
        }}
      />
    );
  }

  if (!question) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[14px] text-muted-2">{d.practiceEmpty}</p>
        <button
          type="button"
          onClick={() => router.push(`/unit/${unitId}`)}
          className="press rounded-2xl border-2 border-ink bg-surface px-5 py-3 text-[14px] font-bold hard-1"
        >
          {d.backArea}
        </button>
      </div>
    );
  }

  const answered = typing ? typed.length === question.wordLength : picked !== null;

  const advance = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPicked(null);
      setTyped("");
      setFeedback(null);
      return;
    }
    const payload = Object.entries(answers).map(([activityId, answer]) => ({
      activityId,
      ...answer,
    }));
    startTransition(async () => {
      setResult(await submitPractice(unitId, payload));
    });
  };

  const commit = () => {
    if (!answered || pending) return;
    if (feedback) {
      advance();
      return;
    }
    // Send the option's text, not its position: the server shuffled these, so
    // an index would mean nothing to it.
    const answer: Answer = typing
      ? { typed }
      : { optionText: picked === null ? undefined : question.options[picked] };
    setAnswers((prev) => ({ ...prev, [question.id]: answer }));
    startTransition(async () => {
      const outcome = await checkAnswer(question.id, answer, lang);
      setFeedback(outcome);
      if (outcome.correct) setCorrectCount((n) => n + 1);
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-[13px] px-[18px] pb-3 pt-4">
        <div className="flex items-center gap-[11px]">
          <button
            type="button"
            onClick={() => router.push(`/unit/${unitId}`)}
            aria-label={d.backArea}
            className="grid size-8 flex-none place-items-center rounded-[11px] border-2 border-ink bg-surface text-[16px] font-bold"
          >
            ×
          </button>
          <div className="flex flex-1 gap-1">
            {questions.map((q, i) => (
              <span
                key={q.id}
                className={cn(
                  "h-[9px] flex-1 rounded-full border-[1.5px] border-ink transition-colors duration-200",
                  i < index ? "bg-brand" : i === index ? "bg-brand-mid" : "bg-surface",
                )}
              />
            ))}
          </div>
          <span className="text-[12px] font-bold">
            {index + 1}/{questions.length}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
            {kicker}
          </span>
          <span className="text-[10.5px] text-muted">
            {correctCount} {d.hits}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-[15px] overflow-auto px-[18px] pb-3">
        <h1 className="font-display text-[21px] font-semibold leading-[1.28] tracking-[-0.02em] text-pretty">
          {lang === "en" ? question.prompt : question.promptEs}
        </h1>

        {typing && question.word ? (
          <button
            type="button"
            onClick={() => speak(question.word!)}
            className="flex items-center gap-3 rounded-[18px] border-2 border-ink bg-surface p-[15px] flat-2"
          >
            <span className="grid size-[42px] flex-none place-items-center rounded-full border-2 border-ink bg-brand text-white">
              <SpeakerIcon />
            </span>
            <Waveform active={speaking} className="flex-1" height={24} grow />
            <span className="w-14 text-right text-[11px] font-semibold text-muted">
              {d.tapRepeat}
            </span>
          </button>
        ) : null}

        {question.sentence ? (
          <div className="rounded-[18px] border-2 border-dashed border-ink bg-cream p-4 text-[17px] font-medium leading-[1.6]">
            {question.sentence}
          </div>
        ) : null}

        {typing ? (
          <div className="flex flex-col gap-4">
            <div className="flex justify-center gap-[7px]">
              {Array.from({ length: question.wordLength }, (_, i) => {
                const char = typed[i] ?? "";
                const graded = feedback !== null;
                return (
                  <span
                    key={i}
                    className={cn(
                      "grid h-[50px] w-[38px] place-items-center rounded-xl border-2 font-display text-[22px] font-bold",
                      graded
                        ? feedback.correct
                          ? "border-pass bg-pass-soft text-pass-deep"
                          : "border-muted-3 bg-locked text-muted"
                        : char
                          ? "border-ink bg-surface"
                          : "border-muted-line bg-locked",
                    )}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {bank.map((letter, i) => {
                const used = typed.split("");
                // Dim a key once the learner has spent that many copies of it.
                const spent =
                  bank.slice(0, i + 1).filter((l) => l === letter).length <=
                  used.filter((l) => l === letter).length;
                const full = typed.length >= question.wordLength || feedback !== null;
                return (
                  <button
                    key={`${letter}-${i}`}
                    type="button"
                    disabled={spent || full}
                    onClick={() => setTyped((v) => v + letter)}
                    className={cn(
                      "press min-w-[42px] rounded-xl border-2 border-ink px-[13px] py-[11px] text-center text-[17px] font-bold",
                      spent
                        ? "bg-canvas text-muted-3 opacity-60 shadow-none"
                        : "bg-surface text-ink hard-1",
                      full && !spent && "opacity-75",
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={feedback !== null}
                onClick={() => setTyped((v) => v.slice(0, -1))}
                className="press min-w-[56px] rounded-xl border-2 border-ink bg-[#F1E7D8] px-[13px] py-[11px] text-center text-[13.5px] font-bold"
              >
                {d.del}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[9px]">
            {question.options.map((option, i) => {
              const isPicked = picked === i;
              const graded = feedback !== null;
              const isAnswer = graded && option === feedback.answer;
              const wrongPick = graded && isPicked && !feedback.correct;
              return (
                <button
                  key={`${option}-${i}`}
                  type="button"
                  disabled={graded}
                  onClick={() => setPicked(i)}
                  className={cn(
                    "flex items-center gap-[11px] rounded-2xl border-2 p-[15px] text-left",
                    isAnswer
                      ? "border-pass bg-pass-soft text-pass-deep shadow-[3px_3px_0_var(--color-pass)]"
                      : wrongPick
                        ? "border-muted-3 bg-locked text-muted shadow-none"
                        : isPicked
                          ? "border-ink bg-brand-soft shadow-[3px_3px_0_var(--color-brand)]"
                          : "press border-ink bg-surface hard-1",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 flex-none place-items-center rounded-lg border-2 text-[12px] font-bold",
                      isAnswer
                        ? "border-pass bg-pass text-white"
                        : wrongPick
                          ? "border-muted-3 bg-canvas"
                          : isPicked
                            ? "border-ink bg-brand text-white"
                            : "border-ink bg-surface",
                    )}
                  >
                    {isAnswer ? "✓" : wrongPick ? "×" : isPicked ? "·" : ""}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-[16px] font-semibold",
                      question.mono && "font-mono",
                    )}
                  >
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[10px] border-t-2 border-rule px-[18px] pb-3 pt-[10px]">
        {feedback ? (
          <div
            className={cn(
              "animate-rise rounded-[14px] border-2 border-ink px-[14px] py-3",
              feedback.correct ? "bg-pass-soft" : "bg-cream",
            )}
          >
            <div
              className={cn(
                "text-[13.5px] font-bold",
                feedback.correct ? "text-pass-deep" : "text-brand-dark",
              )}
            >
              {feedback.correct ? d.correct : d.almost(feedback.answer)}
            </div>
            <div className="mt-[2px] text-[12.5px] leading-[1.45] text-body-2">
              {feedback.note}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={commit}
          disabled={!answered || pending}
          className={cn(
            "rounded-2xl border-2 border-ink py-[14px] text-center font-display text-[16.5px] font-bold",
            answered
              ? "press bg-brand text-white hard-2"
              : "bg-locked text-muted-3 shadow-none",
          )}
        >
          {feedback
            ? index + 1 === questions.length
              ? d.seeResult
              : d.cont
            : d.check}
        </button>
      </div>
    </div>
  );
}
