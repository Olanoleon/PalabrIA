/**
 * Read models for the two administrative consoles.
 *
 * Everything here takes the acting user and scopes by organization through
 * `rbac`, so an Org Admin cannot read another organization's data and never
 * sees the global template.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getSettings, viewFor } from "@/lib/billing";
import { levelFromXp, PASS_THRESHOLD } from "@/lib/xp";
import { activeOrgId, areaScopeFilter, type CurrentUser } from "@/lib/rbac";
import { currentDict } from "@/lib/lang";

const RISK_IDLE_DAYS = 7;

export async function adminContext(user: CurrentUser) {
  const [{ lang, d }, settings, orgId] = await Promise.all([
    currentDict(),
    getSettings(),
    activeOrgId(user),
  ]);
  const org = orgId
    ? await prisma.organization.findUnique({ where: { id: orgId } })
    : null;
  return { lang, d, settings, orgId, org };
}

export type OrgMetrics = {
  learners: number;
  activeLearners: number;
  atRisk: number;
  unitsPassed: number;
  unitsAttempted: number;
  completionRate: number;
  billing: Record<string, number>;
};

/** Dashboard numbers for one organization. */
export async function orgMetrics(orgId: string): Promise<OrgMetrics> {
  const settings = await getSettings();
  const idleBefore = new Date(Date.now() - RISK_IDLE_DAYS * 86_400_000);

  const [learners, progress] = await Promise.all([
    prisma.learner.findMany({
      where: { orgId, user: { isActive: true } },
      select: {
        id: true,
        lastActiveAt: true,
        billingStatus: true,
        paidThrough: true,
      },
    }),
    prisma.unitProgress.findMany({
      where: { learner: { orgId } },
      select: { bestScore: true },
    }),
  ]);

  const billing: Record<string, number> = {};
  let atRisk = 0;
  let activeLearners = 0;

  for (const learner of learners) {
    const view = viewFor(learner, settings);
    billing[view.status] = (billing[view.status] ?? 0) + 1;
    const idle = !learner.lastActiveAt || learner.lastActiveAt < idleBefore;
    if (!idle) activeLearners++;
    // "At risk" is either disengagement or a lapsed subscription — both are
    // reasons an administrator should reach out.
    if (idle || !view.access) atRisk++;
  }

  const unitsPassed = progress.filter((p) => p.bestScore >= PASS_THRESHOLD).length;

  return {
    learners: learners.length,
    activeLearners,
    atRisk,
    unitsPassed,
    unitsAttempted: progress.length,
    completionRate: progress.length ? unitsPassed / progress.length : 0,
    billing,
  };
}

export type LearnerRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  team: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  xp: number;
  level: number;
  streak: number;
  unitsPassed: number;
  lastActiveAt: Date | null;
  billingStatus: string;
  effectiveStatus: string;
  hasAccess: boolean;
  paidThrough: Date | null;
  overrideNote: string | null;
};

export async function learnerRows(orgId: string): Promise<LearnerRow[]> {
  const settings = await getSettings();
  const learners = await prisma.learner.findMany({
    where: { orgId },
    orderBy: { user: { name: "asc" } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          mustChangePassword: true,
        },
      },
      progress: { select: { bestScore: true } },
    },
  });

  return learners.map((learner) => {
    const view = viewFor(learner, settings);
    return {
      id: learner.id,
      userId: learner.user.id,
      name: learner.user.name,
      email: learner.user.email,
      team: learner.team,
      isActive: learner.user.isActive,
      mustChangePassword: learner.user.mustChangePassword,
      xp: learner.xp,
      level: levelFromXp(learner.xp).level,
      streak: learner.streakCount,
      unitsPassed: learner.progress.filter((p) => p.bestScore >= PASS_THRESHOLD).length,
      lastActiveAt: learner.lastActiveAt,
      billingStatus: learner.billingStatus,
      effectiveStatus: view.status,
      hasAccess: view.access,
      paidThrough: learner.paidThrough,
      overrideNote: learner.statusOverrideNote,
    };
  });
}

/**
 * Learners worth chasing: idle for a week, or without access. Computed here
 * rather than in a component so the current time is read during data loading.
 */
export async function atRiskLearners(orgId: string): Promise<LearnerRow[]> {
  const rows = await learnerRows(orgId);
  const idleBefore = new Date(Date.now() - RISK_IDLE_DAYS * 86_400_000);
  return rows.filter(
    (row) => !row.hasAccess || !row.lastActiveAt || row.lastActiveAt < idleBefore,
  );
}

export type ContentArea = {
  id: string;
  name: string;
  nameEs: string | null;
  description: string;
  iconKey: string;
  tint: string;
  sortOrder: number;
  isVisible: boolean;
  fromTemplate: boolean;
  units: Array<{
    id: string;
    name: string;
    sortOrder: number;
    isVisible: boolean;
    difficulty: string;
    wordCount: number;
    activityCount: number;
    generated: boolean;
    fromTemplate: boolean;
  }>;
};

/**
 * The content tree the actor may edit: their own organization's, or the global
 * template when a Super Admin is not in Organization Mode.
 */
export async function contentTree(user: CurrentUser): Promise<ContentArea[]> {
  const filter = await areaScopeFilter(user);
  const areas = await prisma.area.findMany({
    // Administrators see hidden areas too — visibility is theirs to control.
    where: { ...filter, isVisible: undefined },
    orderBy: { sortOrder: "asc" },
    include: {
      units: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { words: true, activities: true } } },
      },
    },
  });

  return areas.map((area) => ({
    id: area.id,
    name: area.name,
    nameEs: area.nameEs,
    description: area.description,
    iconKey: area.iconKey,
    tint: area.tint,
    sortOrder: area.sortOrder,
    isVisible: area.isVisible,
    fromTemplate: area.sourceAreaId !== null,
    units: area.units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      sortOrder: unit.sortOrder,
      isVisible: unit.isVisible,
      difficulty: unit.difficulty,
      wordCount: unit._count.words,
      activityCount: unit._count.activities,
      generated: unit.generatedAt !== null,
      fromTemplate: unit.sourceUnitId !== null,
    })),
  }));
}

/** One area with its units, for the unit-list page. Null when out of scope. */
export async function areaForAdmin(user: CurrentUser, areaId: string) {
  const filter = await areaScopeFilter(user);
  return prisma.area.findFirst({
    where: { ...filter, isVisible: undefined, id: areaId },
    include: {
      units: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { words: true, activities: true } } },
      },
    },
  });
}

/** One unit with everything an administrator can edit. Null when out of scope. */
export async function unitForAdmin(user: CurrentUser, unitId: string) {
  const filter = await areaScopeFilter(user);
  return prisma.unit.findFirst({
    where: { id: unitId, area: { ...filter, isVisible: undefined } },
    include: {
      area: { select: { id: true, name: true, scope: true, orgId: true } },
      words: { orderBy: { sortOrder: "asc" } },
      activities: {
        orderBy: { sortOrder: "asc" },
        include: { word: { select: { id: true, text: true } } },
      },
    },
  });
}

// ── Platform-wide (Super Admin) ────────────────────────────────────────────

export type PlatformMetrics = {
  organizations: number;
  activeOrganizations: number;
  learners: number;
  activeLearners: number;
  monthRevenue: number;
  currency: string;
  pendingPayments: number;
  generatedUnits: number;
  editedAfterGeneration: number;
};

export async function platformMetrics(): Promise<PlatformMetrics> {
  const settings = await getSettings();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const idleBefore = new Date(now.getTime() - RISK_IDLE_DAYS * 86_400_000);

  const [
    organizations,
    activeOrganizations,
    learners,
    activeLearners,
    revenue,
    pendingPayments,
    generatedUnits,
    editedAfterGeneration,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { isActive: true } }),
    prisma.learner.count(),
    prisma.learner.count({ where: { lastActiveAt: { gte: idleBefore } } }),
    // Only confirmed money counts as received; pending declarations are claims.
    prisma.payment.aggregate({
      where: { reviewState: "CONFIRMED", declaredAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { reviewState: "PENDING" } }),
    prisma.unit.count({ where: { generatedAt: { not: null } } }),
    prisma.unit.count({ where: { generatedAt: { not: null }, editedAfterGen: true } }),
  ]);

  return {
    organizations,
    activeOrganizations,
    learners,
    activeLearners,
    monthRevenue: revenue._sum.amount ?? 0,
    currency: settings.currency,
    pendingPayments,
    generatedUnits,
    editedAfterGeneration,
  };
}

export async function organizationRows() {
  const rows = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { learners: true, areas: true } },
      users: {
        where: { role: "ORG_ADMIN" },
        select: { id: true, name: true, email: true, isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });
  return rows;
}

export async function pendingPayments() {
  return prisma.payment.findMany({
    where: { reviewState: "PENDING" },
    orderBy: { declaredAt: "asc" },
    include: {
      learner: {
        select: {
          id: true,
          paidThrough: true,
          billingStatus: true,
          user: { select: { name: true, email: true } },
          org: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function recentPaymentDecisions(limit = 15) {
  return prisma.payment.findMany({
    where: { reviewState: { not: "PENDING" } },
    orderBy: { reviewedAt: "desc" },
    take: limit,
    include: {
      learner: {
        select: {
          user: { select: { name: true } },
          org: { select: { name: true } },
        },
      },
    },
  });
}
