"use client";

import { useEffect, useRef } from "react";

/**
 * Nudges its child the first time a learner reaches this screen, so they
 * discover that the cards are tappable.
 *
 * The class is applied to the DOM node directly rather than through state:
 * reading localStorage during render would not match what the server rendered,
 * and setting state from an effect just to add a class is a re-render for
 * nothing. The hint retires permanently once it has been seen.
 */
export function FirstTapHint({
  storageKey,
  children,
}: {
  storageKey: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(storageKey) === "1";
    } catch {
      // Private browsing can throw on access; without storage, simply hint.
    }
    if (seen) return;

    node.classList.add("animate-nudge");

    const retire = () => {
      node.classList.remove("animate-nudge");
      try {
        window.localStorage.setItem(storageKey, "1");
      } catch {
        // Nothing to do: the hint just shows again next time.
      }
    };

    // Retires on the first tap, or on its own after a few cycles so it never
    // becomes permanent furniture.
    node.addEventListener("pointerdown", retire, { once: true });
    const timer = setTimeout(retire, 12_000);
    return () => {
      node.removeEventListener("pointerdown", retire);
      clearTimeout(timer);
    };
  }, [storageKey]);

  return <div ref={ref}>{children}</div>;
}
