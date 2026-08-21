"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { t, type Lang } from "@/lib/i18n";
import { ChevronLeft, ChevronRightBig, SpeakerIcon } from "@/components/ui/icons";
import { Waveform } from "@/components/learner/waveform";
import { useSpeech } from "@/lib/use-speech";
import type { UnitDetail } from "@/lib/learner-data";

type Word = UnitDetail["words"][number];

/** Past this many pixels a horizontal drag counts as a swipe, not a tap. */
const SWIPE_THRESHOLD = 48;
/** How long the outgoing card takes to leave, and the incoming one to arrive. */
const EXIT_MS = 190;
const ENTER_MS = 300;
/** Beyond this much vertical movement it is a scroll, so leave it alone. */
const SCROLL_TOLERANCE = 40;

/**
 * Cards mode: a 3D flip card carousel. The front carries the word, IPA and
 * syllable stress with a Listen button; the back carries the Spanish
 * definition, the English example and its Spanish translation.
 *
 * Two ways to move between cards — the arrows and a horizontal swipe — and a
 * tap anywhere on the card turns it over.
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
  // The nudge stops for good once the learner discovers the flip themselves.
  const [everFlipped, setEverFlipped] = useState(false);
  const [drag, setDrag] = useState(0);
  /**
   * A card change is a three-beat animation rather than a content swap: the
   * current card leaves in the direction of travel, the next one is placed off
   * the opposite edge, then it slides in.
   */
  const [slide, setSlide] = useState<{
    dir: 1 | -1;
    stage: "out" | "placed" | "in";
  } | null>(null);
  const gesture = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const { speak, speaking, state } = useSpeech();

  const word = words[index];

  /** dir: 1 moves to the next card, -1 to the previous. */
  const advance = (dir: 1 | -1) => {
    if (slide) return; // ignore input while a transition is in flight
    setDrag(0);
    setSlide({ dir, stage: "out" });
  };

  useEffect(() => {
    if (!slide) return;

    if (slide.stage === "out") {
      const id = setTimeout(() => {
        setIndex((current) => {
          const next = (current + slide.dir + words.length) % words.length;
          if (next >= words.length - 1) onSeen();
          return next;
        });
        setFlipped(false);
        setSlide({ dir: slide.dir, stage: "placed" });
      }, EXIT_MS);
      return () => clearTimeout(id);
    }

    if (slide.stage === "placed") {
      // Two frames: one to paint the card at the far edge without a transition,
      // the next to start it moving. One frame is not reliably enough.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() =>
          setSlide({ dir: slide.dir, stage: "in" }),
        );
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    const id = setTimeout(() => setSlide(null), ENTER_MS);
    return () => clearTimeout(id);
  }, [slide, words.length, onSeen]);

  /** Where the card sits: mid-transition, mid-drag, or at rest. */
  const slideStyle = (): React.CSSProperties => {
    if (slide?.stage === "out") {
      return {
        transform: `translateX(${-slide.dir * 115}%) rotate(${-slide.dir * 3}deg)`,
        opacity: 0,
        transition: `transform ${EXIT_MS}ms cubic-bezier(.4,0,1,1), opacity ${EXIT_MS}ms linear`,
      };
    }
    if (slide?.stage === "placed") {
      return {
        transform: `translateX(${slide.dir * 115}%) rotate(${slide.dir * 3}deg)`,
        opacity: 0,
        transition: "none",
      };
    }
    if (slide?.stage === "in") {
      return {
        transform: "translateX(0) rotate(0deg)",
        opacity: 1,
        transition: `transform ${ENTER_MS}ms cubic-bezier(.2,.9,.3,1), opacity ${Math.round(ENTER_MS * 0.7)}ms linear`,
      };
    }
    return {
      transform: `translateX(${drag}px)`,
      opacity: 1,
      transition: drag === 0 ? "transform 260ms cubic-bezier(.2,.8,.3,1)" : "none",
    };
  };

  const flip = () => {
    setFlipped((v) => !v);
    setEverFlipped(true);
    onSeen();
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (slide) return;
    gesture.current = { x: event.clientX, y: event.clientY, dragging: false };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const start = gesture.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Vertical intent wins: the page must still scroll under the card.
    if (Math.abs(dy) > SCROLL_TOLERANCE && Math.abs(dy) > Math.abs(dx)) {
      gesture.current = null;
      setDrag(0);
      return;
    }
    if (Math.abs(dx) > 6) {
      start.dragging = true;
      // Follows the finger nearly 1:1 so the drag reads as moving the card,
      // with mild resistance at the extremes.
      setDrag(Math.sign(dx) * Math.min(Math.abs(dx) * 0.9, 160));
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = gesture.current;
    gesture.current = null;
    setDrag(0);
    if (!start) return;
    const dx = event.clientX - start.x;
    if (!start.dragging || Math.abs(dx) < SWIPE_THRESHOLD) {
      // Not a swipe: treat it as the tap it was.
      if (!start.dragging) flip();
      return;
    }
    advance(dx < 0 ? 1 : -1);
  };

  // Guarded after the hooks above, which must run on every render.
  if (!word) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold text-muted">
        <span>
          {d.card} {index + 1} / {words.length}
        </span>
        <span className="ml-auto">{flipped ? d.flipBack : d.flipShow}</span>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? d.flipBack : d.flipShow}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            flip();
          }
          if (event.key === "ArrowRight") advance(1);
          if (event.key === "ArrowLeft") advance(-1);
        }}
        // pan-y keeps vertical scrolling with the page while we take the
        // horizontal axis for swiping.
        className="h-[352px] cursor-pointer touch-pan-y select-none [perspective:1300px]"
      >
        <div className="size-full [transform-style:preserve-3d]" style={slideStyle()}>
        <div
          className={cn(
            "size-full [transform-style:preserve-3d]",
            !everFlipped && "[animation:flip-hint_4.2s_ease-in-out_infinite]",
          )}
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
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  speak(word.text);
                }}
                className="press inline-flex items-center gap-2 rounded-[14px] border-2 border-ink bg-brand px-[15px] py-[11px] text-[13.5px] font-bold text-white hard-1"
              >
                <SpeakerIcon />
                {d.listen}
              </button>
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
              {word.exampleSentenceEs ? (
                <p className="mt-[6px] border-l-[3px] border-brand-mid pl-[10px] text-[13.5px] leading-[1.45] text-muted-2 text-pretty">
                  {word.exampleSentenceEs}
                </p>
              ) : null}
            </div>
            <div className="mt-auto flex items-baseline gap-[10px] font-mono text-[14px] text-brand-deep">
              {word.ipa}
              <span className="ml-auto font-sans text-[11px] font-semibold text-muted">
                {word.pos}
              </span>
            </div>
          </div>
        </div>
        </div>
        </div>
      </div>

      <div className="flex items-center gap-[10px]">
        <button
          type="button"
          onClick={() => advance(-1)}
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
          onClick={() => advance(1)}
          aria-label="siguiente"
          className="press grid size-[46px] place-items-center rounded-[14px] border-2 border-ink bg-brand-mid hard-1"
        >
          <ChevronRightBig size={15} />
        </button>
      </div>
    </div>
  );
}
