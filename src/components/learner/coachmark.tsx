"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { completeOnboardingStep } from "@/lib/actions/onboarding";
import type { OnboardingStep } from "@/lib/onboarding";

/**
 * A first-run coach-mark: everything dims except one element, with a card
 * explaining what to do there.
 *
 * Wraps its target rather than taking a selector, so the target can be a
 * server-rendered child (an area card) as easily as a client one. The overlay
 * itself goes through a portal: the targets live inside scrolling flex columns
 * that would otherwise clip a `fixed` child or trap it under a stacking
 * context.
 *
 * The card carries text, deliberately. Every hint in the app before this one
 * was motion-only, which `prefers-reduced-motion` erases entirely
 * (globals.css) — those learners were being taught nothing at all.
 */

const PAD = 8;
const GAP = 12;
const CARD_MAX = 320;

type Rect = { top: number; left: number; width: number; height: number };

export function Coachmark({
  step,
  active,
  title,
  body,
  cta,
  children,
}: {
  step: OnboardingStep;
  /** Server-provided: false once the learner has dismissed this step. */
  active: boolean;
  title: string;
  body: string;
  cta: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const showing = active && !dismissed;

  // Measure on mount and keep the hole glued to the target: these screens
  // scroll, and the area list reflows when the board teaser loads.
  useEffect(() => {
    if (!showing) return;
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const r = node.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [showing]);

  const dismiss = useCallback(() => {
    // Hide first, persist after. The learner should never wait on a round-trip
    // to get to the thing they were just told to tap.
    setDismissed(true);
    void completeOnboardingStep(step);
  }, [step]);

  useEffect(() => {
    if (!showing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [showing, dismiss]);

  return (
    <div ref={ref}>
      {children}
      {showing && rect
        ? createPortal(
            <Overlay
              rect={rect}
              title={title}
              body={body}
              cta={cta}
              onDismiss={dismiss}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function Overlay({
  rect,
  title,
  body,
  cta,
  onDismiss,
}: {
  rect: Rect;
  title: string;
  body: string;
  cta: string;
  onDismiss: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => buttonRef.current?.focus(), []);

  const hole = {
    x: Math.max(0, rect.left - PAD),
    y: Math.max(0, rect.top - PAD),
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  // Below the target when there is room, otherwise above it. Measured against
  // the viewport rather than the document because the scrim is fixed.
  const below = hole.y + hole.height + GAP;
  const roomBelow =
    typeof window !== "undefined" && window.innerHeight - below > 190;
  const cardStyle: React.CSSProperties = roomBelow
    ? { top: below }
    : { bottom: Math.max(GAP, window.innerHeight - hole.y + GAP) };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[120]"
      onClick={onDismiss}
    >
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <mask id="coach-hole">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={hole.x}
              y={hole.y}
              width={hole.width}
              height={hole.height}
              rx="18"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="var(--color-ink)"
          opacity="0.66"
          mask="url(#coach-hole)"
        />
        <rect
          x={hole.x}
          y={hole.y}
          width={hole.width}
          height={hole.height}
          rx="18"
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2.5"
        />
      </svg>

      <div
        className="absolute px-[18px]"
        style={{ left: 0, right: 0, ...cardStyle }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="mx-auto rounded-[20px] border-2 border-ink bg-paper p-4 text-left flat-3"
          style={{ maxWidth: CARD_MAX }}
        >
          <div className="font-display text-[16px] font-bold tracking-[-0.02em]">
            {title}
          </div>
          <p className="mt-1 text-[13px] leading-[1.45] text-body-2">{body}</p>
          <button
            ref={buttonRef}
            type="button"
            onClick={onDismiss}
            className="press mt-3 w-full rounded-2xl border-2 border-ink bg-brand py-[11px] text-center font-display text-[14.5px] font-bold text-white hard-2"
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}
