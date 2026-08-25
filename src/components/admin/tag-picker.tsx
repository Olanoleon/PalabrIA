"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

/**
 * Picks the tag an area is listed under, or names a new one.
 *
 * One field, not a select with a second input underneath it. The field shows
 * the current tag; tapping it opens the list; tapping an option writes that
 * name into the field. Choosing "new" turns the same field editable, and
 * tapping away commits what was typed as a new option, already selected — so
 * naming a tag never means leaving the form to define it first.
 *
 * The list is local state that grows: a tag typed here appears among the
 * options immediately, though it is only really created when the form is
 * submitted, which is the action's job.
 *
 * Submits `tagId` for an existing tag and `newTag` for a name to create; both
 * empty means untagged.
 */
export function TagPicker({
  tags,
  current,
  lang,
}: {
  tags: Array<{ id: string; name: string }>;
  /** The area's tag, when editing rather than creating. */
  current?: { id: string; name: string } | null;
  lang: Lang;
}) {
  const d = adminT(lang);
  const [options, setOptions] = useState(tags);
  const [selected, setSelected] = useState<string | null>(current?.id ?? null);
  const [text, setText] = useState(current?.name ?? "");
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  /** A tap anywhere else closes the list, and commits a name being typed. */
  useEffect(() => {
    const away = (event: PointerEvent) => {
      if (box.current?.contains(event.target as Node)) return;
      setOpen(false);
      if (typing) commitTyped();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  });

  function commitTyped() {
    const name = text.trim();
    setTyping(false);
    if (!name) {
      setSelected(null);
      setText("");
      return;
    }
    // Typing the name of a tag that already exists means that tag, not a
    // second one that reads the same.
    const existing = options.find(
      (o) => o.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      setSelected(existing.id);
      setText(existing.name);
      return;
    }
    const pending = { id: `new:${name}`, name };
    setOptions((prev) => [...prev, pending]);
    setSelected(pending.id);
    setText(name);
  }

  function choose(option: { id: string; name: string } | null) {
    setTyping(false);
    setOpen(false);
    setSelected(option?.id ?? null);
    setText(option?.name ?? "");
  }

  function startNew() {
    setTyping(true);
    setOpen(false);
    setSelected(null);
    setText("");
    // Focus after the field stops being read-only, or the caret goes nowhere.
    requestAnimationFrame(() => field.current?.focus());
  }

  // A pending tag carries its name rather than an id the server would not know.
  const isPending = selected?.startsWith("new:") ?? false;

  return (
    <div className="flex flex-col gap-[6px]" ref={box}>
      <label className="text-[12.5px] font-semibold" htmlFor="area-tag">
        {d.areaTagLabel}
      </label>

      <div className="relative">
        <input
          id="area-tag"
          ref={field}
          value={text}
          readOnly={!typing}
          placeholder={d.areaTagNone}
          onChange={(event) => setText(event.target.value)}
          onClick={() => {
            if (!typing) setOpen((v) => !v);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && typing) {
              event.preventDefault();
              commitTyped();
            }
            if (event.key === "Escape") {
              setOpen(false);
              setTyping(false);
            }
          }}
          className={cn(
            "w-full rounded-xl border-2 border-ink bg-surface px-3 py-[10px] pr-9 text-[13.5px] font-semibold",
            !typing && "cursor-pointer",
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-2"
        >
          ▾
        </span>

        {open ? (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-auto rounded-xl border-2 border-ink bg-paper py-1 flat-2"
          >
            <Option onSelect={() => choose(null)} muted>
              {d.areaTagNone}
            </Option>
            {options.map((option) => (
              <Option
                key={option.id}
                onSelect={() => choose(option)}
                active={option.id === selected}
              >
                {option.name}
              </Option>
            ))}
            <Option onSelect={startNew} accent>
              {d.areaTagNew}
            </Option>
          </ul>
        ) : null}
      </div>

      <input type="hidden" name="tagId" value={isPending ? "" : (selected ?? "")} />
      <input type="hidden" name="newTag" value={isPending ? text.trim() : ""} />
    </div>
  );
}

function Option({
  children,
  onSelect,
  active,
  muted,
  accent,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  active?: boolean;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        // pointerdown, not click: the outside-tap handler runs on pointerdown
        // and would close the list before a click ever landed.
        onPointerDown={(event) => {
          event.preventDefault();
          onSelect();
        }}
        className={cn(
          "w-full px-3 py-[9px] text-left text-[13.5px] font-semibold",
          active && "bg-brand-soft",
          muted && "text-muted-2",
          accent && "text-brand-deep",
          !active && "hover:bg-cream",
        )}
      >
        {children}
      </button>
    </li>
  );
}
