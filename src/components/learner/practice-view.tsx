"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { lettersOnly } from "@/lib/answer";
import { t, type Lang } from "@/lib/i18n";
import { ChevronLeft, SpeakerIcon } from "@/components/ui/icons";
import { Waveform } from "@/components/learner/waveform";
import { useSpeech } from "@/lib/use-speech";
import { checkAnswer, submitPractice, type CheckResult } from "@/lib/actions/practice";
import type { PracticeStep } from "@/lib/learner-data";
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
  steps,
  lang,
}: {
  unitId: string;
  unitName: string;
  areaId: string;
  steps: PracticeStep[];
  lang: Lang;
}) {
  const d = t(lang);
  const router = useRouter();
  const { speak, speaking } = useSpeech();
  const [pending, startTransition] = useTransition();

  const [index, setIndex] = useState(0);
  /**
   * The furthest question reached. Anything behind it is history: the learner
   * may look back at what they answered, but not change it — the score and the
   * XP built on it have to mean something.
   */
  const [maxReached, setMaxReached] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  /**
   * Verdicts by activity id rather than one slot for the current question, so
   * a graded answer survives moving on and can be shown again on the way back.
   */
  const [verdicts, setVerdicts] = useState<Record<string, CheckResult>>({});
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<ResultSummary | null>(null);

  /** Which meaning the learner has dropped on which word, for a match screen. */
  const [pairing, setPairing] = useState<Record<string, string>>({});
  const [activeRow, setActiveRow] = useState<string | null>(null);

  const step = steps[index];
  const question = step?.kind === "single" ? step : null;
  const match = step?.kind === "match" ? step : null;
  const typing = question?.type === "TYPE_WHAT_YOU_HEAR";
  const reviewing = index < maxReached;
  const feedback = question ? (verdicts[question.id] ?? null) : null;

  // A match screen is three graded rows, so its verdict is a tally rather than
  // a single right/wrong.
  const matchVerdicts = match ? match.rows.map((r) => verdicts[r.id]) : [];
  const matchGraded = match ? matchVerdicts.every(Boolean) : false;
  const matchCorrect = matchVerdicts.filter((v) => v?.correct).length;

  const kicker = useMemo(() => {
    if (!question) return d.kickerMatch;
    if (question.type === "FILL_BLANK") return d.kickerBlank;
    if (question.type === "IPA_MATCH") return d.kickerIpa;
    return d.kickerAudio;
  }, [question, d]);

  const bank = useMemo(() => {
    if (!question?.word) return [];
    // lettersOnly, so a two-word entry never puts a space tile on the keypad.
    const letters = lettersOnly(question.word).split("");
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
          setMaxReached(0);
          setAnswers({});
          setPicked(null);
          setTyped("");
          setVerdicts({});
          setPairing({});
          setActiveRow(null);
          setCorrectCount(0);
        }}
      />
    );
  }

  if (!step) {
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

  // What to paint: the live inputs at the frontier, the stored answer behind it.
  const stored = question ? answers[question.id] : undefined;
  const shownTyped = reviewing ? (stored?.typed ?? "") : typed;
  const shownPicked = !question
    ? null
    : reviewing
      ? stored?.optionText
        ? question.options.indexOf(stored.optionText)
        : null
      : picked;
  const shownPairing: Record<string, string> = !match
    ? {}
    : reviewing
      ? Object.fromEntries(
          match.rows.map((r) => [r.id, answers[r.id]?.optionText ?? ""]),
        )
      : pairing;

  const answered = match
    ? match.rows.every((r) => shownPairing[r.id])
    : typing
      ? typed.length === (question?.wordLength ?? 0)
      : picked !== null;
  const graded = match ? matchGraded : feedback !== null;

  const advance = () => {
    if (index + 1 < steps.length) {
      const next = index + 1;
      setIndex(next);
      setMaxReached((m) => Math.max(m, next));
      setPicked(null);
      setTyped("");
      setPairing({});
      setActiveRow(null);
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
    // Looking back is read-only: nothing here re-grades or re-submits.
    if (reviewing) {
      setIndex((i) => Math.min(maxReached, i + 1));
      return;
    }
    if (!answered || pending) return;
    if (graded) {
      advance();
      return;
    }

    // A match screen commits its three rows together: each is an ordinary
    // graded activity, so the server needs no notion of "match" at all.
    if (match) {
      const submitted = match.rows.map(
        (r) => [r.id, { optionText: pairing[r.id] }] as const,
      );
      setAnswers((prev) => ({ ...prev, ...Object.fromEntries(submitted) }));
      startTransition(async () => {
        const outcomes = await Promise.all(
          match.rows.map((r) =>
            checkAnswer(r.id, { optionText: pairing[r.id] }, lang),
          ),
        );
        setVerdicts((prev) => ({
          ...prev,
          ...Object.fromEntries(match.rows.map((r, i) => [r.id, outcomes[i]])),
        }));
        setCorrectCount((n) => n + outcomes.filter((o) => o.correct).length);
      });
      return;
    }

    if (!question) return;
    // Send the option's text, not its position: the server shuffled these, so
    // an index would mean nothing to it.
    const answer: Answer = typing
      ? { typed }
      : { optionText: picked === null ? undefined : question.options[picked] };
    setAnswers((prev) => ({ ...prev, [question.id]: answer }));
    startTransition(async () => {
      const outcome = await checkAnswer(question.id, answer, lang);
      setVerdicts((prev) => ({ ...prev, [question.id]: outcome }));
      if (outcome.correct) setCorrectCount((n) => n + 1);
    });
  };

  /**
   * Drop a meaning on the selected word. A meaning belongs to one word at a
   * time, so assigning it anywhere clears it everywhere else — otherwise the
   * learner can leave two words claiming the same meaning and the board stops
   * making sense.
   */
  const assignMeaning = (meaning: string) => {
    if (!activeRow) return;
    setPairing((prev) => {
      const nextPairing: Record<string, string> = {};
      for (const [rowId, value] of Object.entries(prev)) {
        if (value !== meaning) nextPairing[rowId] = value;
      }
      nextPairing[activeRow] = meaning;
      return nextPairing;
    });
    setActiveRow(null);
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
          {/*
            Only appears once there is something behind you, so the header does
            not carry a permanently dead control.
          */}
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label={d.reviewBack}
            className={cn(
              "grid size-8 flex-none place-items-center rounded-[11px] border-2",
              index === 0
                ? "invisible"
                : "press border-ink bg-surface text-ink hard-1",
            )}
          >
            <ChevronLeft />
          </button>
          <div className="flex flex-1 gap-1">
            {steps.map((q, i) => (
              <span
                key={q.id}
                className={cn(
                  "h-[9px] flex-1 rounded-full border-[1.5px] border-ink transition-colors duration-200",
                  i < maxReached
                    ? "bg-brand"
                    : i === maxReached
                      ? "bg-brand-mid"
                      : "bg-surface",
                  // Where you are looking, which may be behind the frontier.
                  i === index && "ring-2 ring-ink ring-offset-1",
                )}
              />
            ))}
          </div>
          <span className="text-[12px] font-bold">
            {index + 1}/{steps.length}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
            {kicker}
          </span>
          {reviewing ? (
            <span className="rounded-full border-[1.5px] border-muted-line bg-locked px-2 py-[1px] text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
              {d.reviewBadge}
            </span>
          ) : (
            <span className="text-[10.5px] text-muted">
              {correctCount} {d.hits}
            </span>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-[15px] overflow-auto px-[18px] pb-3">
        <h1 className="font-display text-[21px] font-semibold leading-[1.28] tracking-[-0.02em] text-pretty">
          {lang === "en" ? step.prompt : step.promptEs}
        </h1>

        {question && typing && question.word ? (
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

        {question?.sentence ? (
          <div className="rounded-[18px] border-2 border-dashed border-ink bg-cream p-4 text-[17px] font-medium leading-[1.6]">
            {question.sentence}
          </div>
        ) : null}

        {match ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[9px]">
              {match.rows.map((row) => {
                const chosen = shownPairing[row.id];
                const rowVerdict = verdicts[row.id];
                const isActive = activeRow === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    disabled={matchGraded || reviewing}
                    onClick={() => setActiveRow(isActive ? null : row.id)}
                    className={cn(
                      "flex items-center gap-[11px] rounded-2xl border-2 p-[13px] text-left",
                      rowVerdict
                        ? rowVerdict.correct
                          ? "border-pass bg-pass-soft shadow-[3px_3px_0_var(--color-pass)]"
                          : "border-muted-3 bg-locked shadow-none"
                        : isActive
                          ? "border-ink bg-brand-soft shadow-[3px_3px_0_var(--color-brand)]"
                          : "press border-ink bg-surface hard-1",
                    )}
                  >
                    <span className="min-w-[86px] flex-none text-[15.5px] font-bold">
                      {row.en}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-[13.5px]",
                        chosen ? "font-semibold text-ink" : "text-muted-3",
                      )}
                    >
                      {rowVerdict && !rowVerdict.correct
                        ? rowVerdict.answer
                        : chosen || d.matchPick}
                    </span>
                    {rowVerdict ? (
                      <span
                        className={cn(
                          "grid size-6 flex-none place-items-center rounded-lg border-2 text-[12px] font-bold",
                          rowVerdict.correct
                            ? "border-pass bg-pass text-white"
                            : "border-muted-3 bg-canvas",
                        )}
                      >
                        {rowVerdict.correct ? "✓" : "×"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {match.meanings.map((meaning) => {
                const taken = Object.values(shownPairing).includes(meaning);
                return (
                  <button
                    key={meaning}
                    type="button"
                    disabled={matchGraded || reviewing || !activeRow}
                    onClick={() => assignMeaning(meaning)}
                    className={cn(
                      "rounded-xl border-2 border-ink px-[13px] py-[9px] text-[13.5px] font-semibold",
                      taken
                        ? "bg-canvas text-muted-3 opacity-60 shadow-none"
                        : activeRow
                          ? "press bg-surface hard-1"
                          : "bg-surface opacity-80 shadow-none",
                    )}
                  >
                    {meaning}
                  </button>
                );
              })}
            </div>
          </div>
        ) : typing ? (
          <div className="flex flex-col gap-4">
            {/*
              One group per word, with a wide gap standing in for the space.
              The keypad has no space key and the learner should not go looking
              for one — "dining room" is typed as ten letters.
            */}
            <div className="flex flex-wrap items-center justify-center gap-x-[17px] gap-y-[9px]">
              {question.wordShape.map((length, group) => {
                const offset = question.wordShape
                  .slice(0, group)
                  .reduce((sum, n) => sum + n, 0);
                return (
                  <div key={group} className="flex gap-[7px]">
                    {Array.from({ length }, (_, j) => {
                      const i = offset + j;
                      const char = shownTyped[i] ?? "";
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
                );
              })}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {bank.map((letter, i) => {
                const used = shownTyped.split("");
                // Dim a key once the learner has spent that many copies of it.
                const spent =
                  bank.slice(0, i + 1).filter((l) => l === letter).length <=
                  used.filter((l) => l === letter).length;
                const full =
                  reviewing ||
                  shownTyped.length >= question.wordLength ||
                  feedback !== null;
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
                disabled={reviewing || feedback !== null}
                onClick={() => setTyped((v) => v.slice(0, -1))}
                className="press min-w-[56px] rounded-xl border-2 border-ink bg-[#F1E7D8] px-[13px] py-[11px] text-center text-[13.5px] font-bold"
              >
                {d.del}
              </button>
            </div>
          </div>
        ) : question ? (
          <div className="flex flex-col gap-[9px]">
            {question.options.map((option, i) => {
              const isPicked = shownPicked === i;
              const graded = feedback !== null;
              const isAnswer = graded && option === feedback.answer;
              const wrongPick = graded && isPicked && !feedback.correct;
              return (
                <button
                  key={`${option}-${i}`}
                  type="button"
                  disabled={graded || reviewing}
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
        ) : null}
      </div>

      <div className="flex flex-col gap-[10px] border-t-2 border-rule px-[18px] pb-3 pt-[10px]">
        {match && matchGraded ? (
          <div
            className={cn(
              "animate-rise rounded-[14px] border-2 border-ink px-[14px] py-3",
              matchCorrect === match.rows.length ? "bg-pass-soft" : "bg-cream",
            )}
          >
            <div
              className={cn(
                "text-[13.5px] font-bold",
                matchCorrect === match.rows.length
                  ? "text-pass-deep"
                  : "text-brand-dark",
              )}
            >
              {d.matchTally(matchCorrect, match.rows.length)}
            </div>
          </div>
        ) : null}

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
          disabled={!reviewing && (!answered || pending)}
          className={cn(
            "rounded-2xl border-2 border-ink py-[14px] text-center font-display text-[16.5px] font-bold",
            reviewing || answered
              ? "press bg-brand text-white hard-2"
              : "bg-locked text-muted-3 shadow-none",
          )}
        >
          {reviewing
            ? d.reviewResume
            : graded
              ? index + 1 === steps.length
                ? d.seeResult
                : d.cont
              : d.check}
        </button>
      </div>
    </div>
  );
}
