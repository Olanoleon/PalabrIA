"use client";

import { useState } from "react";
import { adminT } from "@/lib/i18n-admin";
import type { Lang } from "@/lib/i18n";

/**
 * Chooses the heading an area is listed under, or creates one.
 *
 * One control rather than two screens: an administrator naming a group is
 * almost always doing it because they are filing an area right now, so making
 * them go and define the group first would be a detour with nothing at the end
 * of it. Picking "new" reveals a name field in place.
 *
 * Submits either `groupId` or `newGroup`; the action prefers the name when both
 * arrive, and treats neither as ungrouped.
 */
export function GroupPicker({
  groups,
  current,
  lang,
}: {
  groups: Array<{ id: string; name: string }>;
  /** The area's current group, when editing rather than creating. */
  current?: string | null;
  lang: Lang;
}) {
  const d = adminT(lang);
  const [choice, setChoice] = useState(current ?? "");

  return (
    <div className="flex flex-col gap-[6px]">
      <label className="text-[12.5px] font-semibold" htmlFor="area-group">
        {d.areaGroupLabel}
      </label>
      <select
        id="area-group"
        name="groupId"
        value={choice === "__new__" ? "__new__" : choice}
        onChange={(event) => setChoice(event.target.value)}
        className="rounded-xl border-2 border-ink bg-surface px-3 py-[10px] text-[13.5px] font-semibold"
      >
        <option value="">{d.areaGroupNone}</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
        <option value="__new__">{d.areaGroupNew}</option>
      </select>

      {choice === "__new__" ? (
        <input
          name="newGroup"
          required
          maxLength={60}
          autoFocus
          placeholder={d.areaGroupNewLabel}
          className="mt-1 rounded-xl border-2 border-ink bg-surface px-3 py-[10px] text-[13.5px] font-semibold"
        />
      ) : null}

      <p className="text-[11.5px] leading-[1.4] text-muted-2">{d.areaGroupHint}</p>
    </div>
  );
}
