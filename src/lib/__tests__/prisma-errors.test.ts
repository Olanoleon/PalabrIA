import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "@/lib/prisma";

/**
 * Shape-checked on purpose.
 *
 * `error instanceof Prisma.PrismaClientKnownRequestError` looked correct and
 * failed in production code: the client is generated into the source tree, and
 * inside a bundled server action the class attached to the thrown error was not
 * the same module instance as the one the check imported. The result was a 500
 * where a "that email is taken" message belonged.
 */
describe("isUniqueViolation", () => {
  it("recognises a P2002 by its code", () => {
    expect(
      isUniqueViolation({ code: "P2002", meta: { target: ["email"] } }),
    ).toBe(true);
  });

  it("does not care which class the error came from", () => {
    class SomeOtherCopyOfTheError extends Error {
      code = "P2002";
    }
    expect(isUniqueViolation(new SomeOtherCopyOfTheError())).toBe(true);
  });

  it("ignores other Prisma failures", () => {
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
  });

  it("ignores ordinary errors and nullish values", () => {
    expect(isUniqueViolation(new Error("nope"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
  });
});
