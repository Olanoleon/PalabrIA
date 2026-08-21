"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pronunciation via the browser's own speech synthesis.
 *
 * The design fakes audio with a 1.4s waveform animation; this drives the same
 * animation from real speech, so the bars run for exactly as long as the voice
 * does. A future version can swap in a hosted voice by replacing this hook.
 */
export type SpeechState = "idle" | "speaking" | "unsupported";

const PREFERRED_VOICES = [
  "Samantha",
  "Google US English",
  "Microsoft Aria Online (Natural) - English (United States)",
  "Alex",
];

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  return (
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

function supported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useSpeech() {
  // Support is read at mount rather than written from an effect: the server
  // renders "idle", and the first client render settles on the real answer.
  const [state, setState] = useState<SpeechState>("idle");
  const voice = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!supported()) return;
    // Voices load asynchronously in Chrome, synchronously in Safari.
    const load = () => {
      voice.current = pickVoice();
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string, options?: { rate?: number }) => {
      if (!supported()) {
        setState("unsupported");
        return;
      }
      // Cancel first: tapping "listen" twice should restart, not queue.
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = options?.rate ?? 0.95;
      if (voice.current) utterance.voice = voice.current;
      utterance.onstart = () => setState("speaking");
      utterance.onend = () => setState("idle");
      utterance.onerror = () => setState("idle");
      window.speechSynthesis.speak(utterance);
      // Safari sometimes never fires onstart; show the animation optimistically.
      setState("speaking");
    },
    [],
  );

  const stop = useCallback(() => {
    if (supported()) window.speechSynthesis.cancel();
    setState("idle");
  }, []);

  return { speak, stop, state, speaking: state === "speaking" };
}
