import { describe, expect, it } from "vitest";
import {
  Forbidden,
  areaScopeFor,
  assertGlobalWriteFor,
  assertOrgWriteFor,
  homeFor,
  type Actor,
} from "@/lib/scope";

const learner: Actor = { id: "u1", role: "LEARNER", orgId: "org-a" };
const orgAdmin: Actor = { id: "u2", role: "ORG_ADMIN", orgId: "org-a" };
const superAdmin: Actor = { id: "u3", role: "SUPER_ADMIN", orgId: null };

describe("areaScopeFor", () => {
  it("limits a learner to their own organization's visible areas", () => {
    expect(areaScopeFor(learner, null)).toEqual({
      scope: "ORG",
      orgId: "org-a",
      isVisible: true,
    });
  });

  it("limits an org admin to their own organization, hidden areas included", () => {
    expect(areaScopeFor(orgAdmin, null)).toEqual({ scope: "ORG", orgId: "org-a" });
  });

  it("ignores an org-mode cookie for an org admin", () => {
    // An Org Admin must never be able to widen their own scope.
    expect(areaScopeFor(orgAdmin, "org-b")).toEqual({
      scope: "ORG",
      orgId: "org-a",
    });
  });

  it("gives the super admin the template by default", () => {
    expect(areaScopeFor(superAdmin, null)).toEqual({ scope: "GLOBAL" });
  });

  it("scopes the super admin to one organization in Organization Mode", () => {
    expect(areaScopeFor(superAdmin, "org-b")).toEqual({
      scope: "ORG",
      orgId: "org-b",
    });
  });

  it("refuses an actor with no organization", () => {
    expect(() => areaScopeFor({ ...orgAdmin, orgId: null }, null)).toThrow(Forbidden);
    expect(() => areaScopeFor({ ...learner, orgId: null }, null)).toThrow(Forbidden);
  });
});

describe("write guards", () => {
  it("lets an org admin write only to their own organization", () => {
    expect(() => assertOrgWriteFor(orgAdmin, "org-a")).not.toThrow();
    expect(() => assertOrgWriteFor(orgAdmin, "org-b")).toThrow(Forbidden);
  });

  it("lets the super admin write to any organization", () => {
    expect(() => assertOrgWriteFor(superAdmin, "org-b")).not.toThrow();
  });

  it("never lets a learner write to an organization", () => {
    expect(() => assertOrgWriteFor(learner, "org-a")).toThrow(Forbidden);
  });

  it("reserves the global template for the super admin", () => {
    expect(() => assertGlobalWriteFor(superAdmin)).not.toThrow();
    expect(() => assertGlobalWriteFor(orgAdmin)).toThrow(Forbidden);
    expect(() => assertGlobalWriteFor(learner)).toThrow(Forbidden);
  });
});

describe("homeFor", () => {
  it("routes each role to its own console", () => {
    expect(homeFor("LEARNER")).toBe("/path");
    expect(homeFor("ORG_ADMIN")).toBe("/admin");
    expect(homeFor("SUPER_ADMIN")).toBe("/super");
  });
});
