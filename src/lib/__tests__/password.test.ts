import { describe, expect, it } from "vitest";
import { passwordProblem, usesPin } from "@/lib/password";

const LEARNER = { role: "LEARNER" as const, email: "ana@arkusnexus.com" };
const ADMIN = { role: "ORG_ADMIN" as const, email: "admin@arkusnexus.com" };

describe("usesPin", () => {
  it("is true only for learners", () => {
    expect(usesPin("LEARNER")).toBe(true);
    expect(usesPin("ORG_ADMIN")).toBe(false);
    expect(usesPin("SUPER_ADMIN")).toBe(false);
  });
});

describe("a learner's PIN", () => {
  it("accepts exactly four digits", () => {
    expect(passwordProblem({ ...LEARNER, password: "4827", confirm: "4827" })).toBe(
      null,
    );
  });

  it("accepts a PIN that starts with zero", () => {
    // The column is a string precisely so "0042" does not become 42.
    expect(passwordProblem({ ...LEARNER, password: "0042", confirm: "0042" })).toBe(
      null,
    );
  });

  it("rejects three digits and five digits", () => {
    expect(passwordProblem({ ...LEARNER, password: "482", confirm: "482" })).toBe(
      "notPin",
    );
    expect(passwordProblem({ ...LEARNER, password: "48271", confirm: "48271" })).toBe(
      "notPin",
    );
  });

  it("rejects anything that is not a digit", () => {
    expect(passwordProblem({ ...LEARNER, password: "48a7", confirm: "48a7" })).toBe(
      "notPin",
    );
    expect(passwordProblem({ ...LEARNER, password: "48 7", confirm: "48 7" })).toBe(
      "notPin",
    );
    expect(passwordProblem({ ...LEARNER, password: "", confirm: "" })).toBe("notPin");
  });

  it("rejects a mistyped confirmation", () => {
    expect(passwordProblem({ ...LEARNER, password: "4827", confirm: "4828" })).toBe(
      "mismatch",
    );
  });

  it("reports the format before the mismatch", () => {
    // Telling someone their PINs do not match is unhelpful when the real
    // problem is that neither one is a PIN.
    expect(passwordProblem({ ...LEARNER, password: "abc", confirm: "xyz" })).toBe(
      "notPin",
    );
  });

  it("does not hold a learner to the 8-character minimum", () => {
    expect(passwordProblem({ ...LEARNER, password: "1234", confirm: "1234" })).toBe(
      null,
    );
  });
});

describe("an administrator's password", () => {
  it("accepts eight characters or more", () => {
    expect(
      passwordProblem({ ...ADMIN, password: "correcthorse", confirm: "correcthorse" }),
    ).toBe(null);
  });

  it("rejects seven characters", () => {
    expect(passwordProblem({ ...ADMIN, password: "sevench", confirm: "sevench" })).toBe(
      "short",
    );
  });

  it("rejects a four-digit PIN", () => {
    // The whole point of splitting by role: what a learner must use is exactly
    // what an administrator may not.
    expect(passwordProblem({ ...ADMIN, password: "4827", confirm: "4827" })).toBe(
      "short",
    );
  });

  it("rejects a mistyped confirmation", () => {
    expect(
      passwordProblem({ ...ADMIN, password: "correcthorse", confirm: "correcthors" }),
    ).toBe("mismatch");
  });

  it("rejects the account's own email, whatever the casing", () => {
    expect(
      passwordProblem({
        ...ADMIN,
        password: "Admin@ArkusNexus.com",
        confirm: "Admin@ArkusNexus.com",
      }),
    ).toBe("sameAsEmail");
  });

  it("applies to super admins too", () => {
    expect(
      passwordProblem({
        role: "SUPER_ADMIN",
        email: "super@palabria.app",
        password: "1234",
        confirm: "1234",
      }),
    ).toBe("short");
  });
});
