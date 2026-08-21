"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { t, type Lang } from "@/lib/i18n";
import { ChevronLeft, ChevronRightBig, SpeakerIcon } from "@/components/ui/icons";
import { Waveform } from "@/components/learner/waveform";
import { useSpeech } from "@/lib/use-speech";
import type { UnitDetail } from "@/lib/learner-data";

type Word = UnitDetail["words"][number];

/**
 * Cards mode: a 3D flip card carousel. The front carries the word, IPA and
 * syllable stress with a Listen button; the back carries the Spanish definition
 * and the English example.
 */
export function CardsMode({
  words,
  lang,
  onSeen,
}: {
  words: Word[];
  lang: Lang;
  onSeen: () => void;
}) {
  const d = t(lang);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const { speak, speaking, state } = useSpeech();

  const word = words[index];
  if (!word) return null;

  const go = (next: number) => {
    setIndex((next + words.length) % words.length);
    setFlipped(false);
    if (next >= words.length - 1) onSeen();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold text-muted">
        <span>
          {d.card} {index + 1} / {words.length}
        </span>
        <span className="ml-auto">{flipped ? d.flipBack : d.flipShow}</span>
      </div>

      <button
        type="button"
        onClick={() => {
          setFlipped((v) => !v);
          onSeen();
        }}
        className="h-[352px] [perspective:1300px]"
        aria-label={flipped ? d.flipBack : d.flipShow}
      >
        <div
          className="relative size-full transition-transform duration-[520ms] [transform-style:preserve-3d]"
          style={{
            transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col gap-2 overflow-hidden rounded-[22px] border-[2.5px] border-ink bg-surface p-[22px] text-left [backface-visibility:hidden] flat-3">
            <div className="absolute -right-[30px] -top-[30px] size-[130px] rounded-full bg-brand-soft" />
            <div className="relative text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
              {d.pron}
            </div>
            <h2 className="relative mt-[18px] font-display text-[40px] font-bold leading-none tracking-[-0.04em]">
              {word.text}
            </h2>
            <div className="relative font-mono text-[21px] font-medium text-brand-deep">
              {word.ipa}
            </div>
            <div className="relative text-[12.5px] font-medium text-muted-2">
              {word.syllables} · {d.stress} {d.q1}
              {word.stress}
              {d.q2}
            </div>
            <div className="relative mt-auto flex items-center gap-3">
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  speak(word.text);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.stopPropagation();
                    event.preventDefault();
                    speak(word.text);
                  }
                }}
                className="press inline-flex items-center gap-2 rounded-[14px] border-2 border-ink bg-brand px-[15px] py-[11px] text-[13.5px] font-bold text-white hard-1"
              >
                <SpeakerIcon />
                {d.listen}
              </span>
              <Waveform active={speaking} />
            </div>
            {state === "unsupported" ? (
              <p className="relative text-[11px] text-muted">{d.ttsUnsupported}</p>
            ) : null}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col gap-[13px] rounded-[22px] border-[2.5px] border-ink bg-cream p-[22px] text-left [backface-visibility:hidden] flat-3"
            style={{ transform: "rotateY(180deg)" }}
          >
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                {d.defTitle}
              </div>
              <p className="mt-[7px] text-[16.5px] font-medium leading-[1.45] text-pretty">
                {lang === "en" ? word.definition : word.definitionEs}
              </p>
            </div>
            <div className="h-[2px] rounded-sm bg-rule" />
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                {d.exTitle}
              </div>
              <p className="mt-[7px] text-[15.5px] italic leading-[1.5] text-body-2 text-pretty">
                {d.q1}
                {word.exampleSentence}
                {d.q2}
              </p>
            </div>
            <div className="mt-auto flex items-baseline gap-[10px] font-mono text-[14px] text-brand-deep">
              {word.ipa}
              <span className="ml-auto font-sans text-[11px] font-semibold text-muted">
                {word.pos}
              </span>
            </div>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-[10px]">
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="anterior"
          className="press grid size-[46px] place-items-center rounded-[14px] border-2 border-ink bg-surface hard-1"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="flex flex-1 justify-center gap-[5px]">
          {words.map((w, i) => (
            <span
              key={w.id}
              className={cn(
                "h-2 rounded-full border-[1.5px] border-ink transition-all duration-200",
                i === index ? "w-[22px] bg-brand" : "w-2 bg-surface",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="siguiente"
          className="press grid size-[46px] place-items-center rounded-[14px] border-2 border-ink bg-brand-mid hard-1"
        >
          <ChevronRightBig size={15} />
        </button>
      </div>
    </div>
  );
}
