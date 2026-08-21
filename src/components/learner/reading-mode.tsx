"use client";

import { useMemo } from "react";
import { t, type Lang } from "@/lib/i18n";
import { SpeakerIcon } from "@/components/ui/icons";
import { Waveform } from "@/components/learner/waveform";
import { useSpeech } from "@/lib/use-speech";
import type { UnitDetail } from "@/lib/learner-data";

type Word = UnitDetail["words"][number];

/**
 * Splits the paragraph into tokens, marking the ones that are unit vocabulary.
 * Matching tolerates trailing punctuation and simple plurals, the same way the
 * design's word matcher does.
 */
function tokenize(paragraph: string, words: Word[]) {
  const byBare = new Map<string, Word>();
  for (const word of words) {
    const bare = word.text.toLowerCase();
    byBare.set(bare, word);
    byBare.set(`${bare}s`, word);
    byBare.set(`${bare}es`, word);
  }
  return paragraph.split(" ").map((token, index) => {
    const match = token.match(/^([A-Za-z']+)([^A-Za-z']*)$/);
    const bare = (match ? match[1] : token).toLowerCase();
    const word = byBare.get(bare);
    return {
      key: `${index}-${token}`,
      text: match && word ? match[1] : token,
      tail: match && word ? match[2] : "",
      word: word ?? null,
    };
  });
}

export function ReadingMode({
  unit,
  lang,
}: {
  unit: UnitDetail;
  lang: Lang;
}) {
  const d = t(lang);
  const { speak, stop, speaking } = useSpeech();
  const tokens = useMemo(
    () => tokenize(unit.introParagraph, unit.words),
    [unit.introParagraph, unit.words],
  );

  return (
    <div className="flex animate-rise flex-col gap-[14px]">
      <div className="flex items-baseline gap-2">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-deep">
          {d.paraKicker}
        </div>
        <button
          type="button"
          onClick={() => (speaking ? stop() : speak(unit.introParagraph, { rate: 0.9 }))}
          className="press ml-auto inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-brand-soft px-3 py-[5px] text-[11.5px] font-bold"
        >
          <SpeakerIcon size={13} />
          {speaking ? d.paraStop : d.paraPlay}
        </button>
      </div>

      <p className="text-[18px] leading-[1.72] text-pretty">
        {tokens.map((token) =>
          token.word ? (
            <span key={token.key}>
              <button
                type="button"
                onClick={() => speak(token.word!.text)}
                className="rounded-sm bg-highlight font-bold shadow-[0_2px_0_var(--color-brand)]"
                title={token.word.translation}
              >
                {token.text}
              </button>
              <span>{token.tail} </span>
            </span>
          ) : (
            <span key={token.key}>{token.text} </span>
          ),
        )}
      </p>

      {lang === "es" && unit.introParagraphEs ? (
        <div className="border-l-[3px] border-brand-mid pl-3 text-[13px] leading-[1.55] text-muted-2">
          {unit.introParagraphEs}
        </div>
      ) : null}

      <div className="flex flex-col gap-[10px] rounded-2xl border-2 border-ink bg-surface p-[14px] flat-2">
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-semibold text-muted-2">
            {d.chipsNote(unit.words.length)}
          </span>
          <Waveform active={speaking} className="ml-auto" height={14} />
        </div>
        <div className="flex flex-wrap gap-[7px]">
          {unit.words.map((word) => (
            <button
              key={word.id}
              type="button"
              onClick={() => speak(word.text)}
              className="press flex items-baseline gap-[6px] rounded-full border-[1.5px] border-ink bg-brand-soft px-[10px] py-[5px] text-[12.5px] font-semibold"
            >
              {word.text}
              <span className="font-mono text-[10.5px] font-normal text-[#8A5A2B]">
                {word.ipa}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
