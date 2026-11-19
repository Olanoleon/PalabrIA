/**
 * How the path screen groups areas into sections.
 *
 * Pure and framework-free — no database, no `server-only` — so the ordering
 * rule can be unit-tested. `learner-data.ts` holds the reading; this holds the
 * arranging.
 */

/** The only part of an area this cares about. */
type Taggable = {
  tag: { id: string; name: string; sortOrder: number } | null;
};

export type AreaSection<T> = {
  /** The tag's name, or null for the untagged section. */
  heading: string | null;
  areas: T[];
};

/**
 * Tagged sections first, in the order the administrator arranged them; the
 * untagged area last, under no heading.
 *
 * Untagged used to lead, on the reasoning that a school tagging only its newest
 * term should not have its older areas filed under an invented label. In
 * practice that buried the tags: the heading is the thing an administrator
 * arranges deliberately, and it sat below an unlabelled pile. Untagged now
 * reads as "everything else", which is what it is.
 */
export function areaSections<T extends Taggable>(areas: T[]): Array<AreaSection<T>> {
  const untagged = areas.filter((a) => !a.tag);
  const tagged = new Map<string, { name: string; sortOrder: number; areas: T[] }>();
  for (const area of areas) {
    if (!area.tag) continue;
    const found = tagged.get(area.tag.id);
    if (found) found.areas.push(area);
    else
      tagged.set(area.tag.id, {
        name: area.tag.name,
        sortOrder: area.tag.sortOrder,
        areas: [area],
      });
  }

  return [
    ...[...tagged.values()]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((g) => ({ heading: g.name, areas: g.areas })),
    ...(untagged.length ? [{ heading: null, areas: untagged }] : []),
  ];
}
