import { describe, expect, it } from "vitest";
import { areaSections } from "@/lib/area-sections";

type Area = {
  name: string;
  tag: { id: string; name: string; sortOrder: number } | null;
};

const area = (name: string, tag?: [string, number]): Area => ({
  name,
  tag: tag ? { id: tag[0], name: tag[0], sortOrder: tag[1] } : null,
});

const shape = (areas: Area[]) =>
  areaSections(areas).map((s) => [s.heading, s.areas.map((a) => a.name)]);

describe("areaSections", () => {
  it("puts tagged sections first and the untagged one last", () => {
    expect(
      shape([
        area("Body"),
        area("Food", ["Nivel 1", 0]),
        area("Colors"),
        area("Travel", ["Nivel 2", 1]),
      ]),
    ).toEqual([
      ["Nivel 1", ["Food"]],
      ["Nivel 2", ["Travel"]],
      [null, ["Body", "Colors"]],
    ]);
  });

  it("orders the tagged sections by the tag's own sortOrder, not by encounter", () => {
    expect(
      shape([area("A", ["Segundo", 5]), area("B", ["Primero", 1])]),
    ).toEqual([
      ["Primero", ["B"]],
      ["Segundo", ["A"]],
    ]);
  });

  it("keeps areas within a section in the order they arrived", () => {
    const [section] = areaSections([
      area("first", ["T", 0]),
      area("second", ["T", 0]),
      area("third", ["T", 0]),
    ]);
    expect(section.areas.map((a) => a.name)).toEqual(["first", "second", "third"]);
  });

  // No heading is drawn for it, so an empty one would render a bare gap.
  it("omits the untagged section entirely when every area is tagged", () => {
    expect(shape([area("Food", ["Nivel 1", 0])])).toEqual([["Nivel 1", ["Food"]]]);
  });

  it("returns a single headingless section when nothing is tagged", () => {
    expect(shape([area("Body"), area("Colors")])).toEqual([
      [null, ["Body", "Colors"]],
    ]);
  });

  it("has nothing to draw for no areas", () => {
    expect(areaSections([])).toEqual([]);
  });
});
