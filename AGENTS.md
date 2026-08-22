<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PalabrIA

Multi-tenant vocabulary learning platform (Spanish speakers learning English).
Next 16 App Router · React 19 · Prisma/Postgres (Neon) · Tailwind v4 · OpenAI.

**Read `README.md` before doing anything non-trivial.** It covers setup, the two
seeds, the destructive-script traps, environment, and deployment; none of that is
repeated here. This file is only what the code and the README don't tell you
outright.

## Where the rules live

The domain logic is concentrated in `src/lib/` and heavily commented at the top of
each file. Read the relevant one instead of grepping:

| Question | File |
| --- | --- |
| XP, level curve, streaks, pass threshold | `xp.ts` |
| Which unit is open, passed, locked | `unlock.ts` |
| Who may see or write which content | `scope.ts` (pure) → `rbac.ts` (Next-bound) |
| Billing lifecycle, grace, access | `billing-rules.ts` (pure) → `billing.ts` — **unreviewed, see below** |
| Grading a practice run and paying it out | `progress.ts` |
| AI generation prompt + schema | `openai.ts`, `unit-schema.ts`, `unit-validate.ts` |
| Writing a draft into an area | `unit-persist.ts` |
| Reading data for the learner / console UI | `learner-data.ts`, `admin-data.ts` |

The four **pure** modules (`xp`, `unlock`, `scope`, `billing-rules`) import no
framework and no database on purpose, which is what makes them unit-testable. Put
new rules there and call them from the server module — not the other way round.

## Layout

- `src/app/(auth)` · `(learner)` · `(console)` route groups.
- `(console)/admin/*` and `(console)/super/*` are **thin parallel shells over the
  same components** in `src/components/admin/` and the same `admin-data.ts`. A
  change to one console almost always needs the mirrored change in the other.
- Next 16 supplies typed route props globally — `PageProps<"/super/unit/[unitId]">`,
  with `params` awaited. Don't hand-write those prop types.

## Conventions that will bite

- Prisma client is generated to `src/generated/prisma`. Import from
  `@/generated/prisma` — **never** `@prisma/client`, including for enum types.
- UI copy lives in two parallel `ES`/`EN` dictionaries: `i18n.ts` (learner) and
  `i18n-admin.ts` (console). Every new key needs both languages in both halves.
  These files are ~25 KB each — `grep` for the key, don't read them whole. Same
  for `actions/admin.ts` and `admin-data.ts`.
- Tailwind v4 through PostCSS. There is no `tailwind.config`; theme lives in CSS.
- `server-only` guards the secret-holding modules. Anything reachable from a
  client component must not import them.

## Invariants — breaking these is a silent data bug

- **Never write back up the content tree.** Org areas are deep copies of the
  global template stamped with `sourceAreaId`/`sourceUnitId` for provenance only.
- **Never trust the client for scoring.** `recordPractice` regrades from stored
  answer keys. Options are shuffled per practice load, so answers arrive as
  option *text*, not an index.
- **Never award XP directly.** Go through `unitAward` — it's a best-score
  ratchet, so a unit pays the same lifetime total whether mastered in one attempt
  or four, and a worse retry pays nothing.
- **`Unit.contentVersion` is bumped only by regeneration**, never by an edit.
  It's what invites a learner back to a unit they passed; a typo fix must not.
- **A match-up is three rows, not one.** The model emits one `MATCH_UP` object
  with three `pairs`; `unit-persist.ts` expands it into three ordinary
  `Activity` rows sharing a `matchGroup`, each with its own `wordId` and its own
  answer among the same three meanings. That is what keeps grading, partial
  credit and coverage counting free of special cases — only the practice screen
  knows rows sharing a group are drawn together. Never store one row for it.
- **Dictation is compared on letters alone.** Vocabulary may be two words
  ("dining room") but the keypad has no space key, so both graders call
  `sameSpelling` in `answer.ts`. Grading is duplicated in `progress.ts` and
  `actions/practice.ts`; `grading.test.ts` exists to catch them drifting.
- **Coverage and session length are generation-time rules.** `unit-validate.ts`
  blocks a unit under 70% distinct-word coverage, over 11 gradeable items, or
  without exactly one match-up. They cannot move to runtime: the score is
  `correct / activities` over the whole unit, so trimming a session there would
  silently mark the trimmed questions wrong.

## Payments are not settled yet

Everything payment-related is **written but unreviewed** — treat it as a draft,
not as an invariant. That covers `billing-rules.ts`, `billing.ts`, `breb.ts`,
`actions/payments.ts`, the `/api/cron/billing` sweep, the `Payment` /
`BillingAudit` models, and the panels in `components/admin/payments-panel.tsx`
and `components/learner/declare-payment.tsx`.

How it currently behaves, so you can read the code faster — **not** rules to
defend:

- Lifecycle is `TRIAL -> ACTIVE <-> PAST_DUE -> SUSPENDED`. `OVERRIDE_ACTIVE`
  and `DISABLED` are admin-set and the sweep skips them.
- Status is recomputed on read as well as by the nightly sweep, so a stale row
  can't grant access.
- Payment is declare-then-review: a learner declares, an admin confirms or
  rejects. `Payment.previousPaidThrough` exists so a rejection restores exactly
  the prior expiry.

Before changing any of it, ask rather than assuming the current shape is
intended. `npm run verify:billing` exercises the lifecycle and is the fastest
way to see what today's behaviour actually is.

## Checks

- `npm run test` — vitest, pure logic only, no database. Fast; run it freely.
- `npm run verify` — four DB-backed end-to-end suites. **They write to whatever
  database they're pointed at**: they reset progress, flip billing states, and
  create then delete an organization. Local seeded DB only, never a deployment.
  They also need `tsx --conditions=react-server`, which is why they run via the
  npm scripts rather than bare `tsx`.
- `npm run typecheck` and `npm run lint` before calling work done.

## Known posture

`ENFORCE_PASSWORD_CHANGE` is **off** for this phase at the owner's request, so
admin-created accounts keep their default password (the user's own email)
indefinitely. This is a deliberate, documented decision — see `lib/config.ts`.
Don't "fix" it; the flag turns the intended behaviour back on retroactively with
no migration.
