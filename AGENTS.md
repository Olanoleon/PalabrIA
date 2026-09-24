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
| What counts as a valid password, by role | `password.ts` (pure) |
| What an unauthenticated visitor may read | `public-data.ts` |
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
- **`/login` is the welcome screen** (register or sign in), **`/signin` is the
  form**. Everything that sends an unauthenticated visitor off to authenticate
  points at `/signin`; only `signOut` and the root redirect land on `/login`.
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

## Regeneration runs outside its request

**"Regenerar con IA" starts a detached job, not a page.** `startUnitRegeneration`
stamps `Unit.regeneratingSince`, fires `runRegeneration` without awaiting it and
returns; the model call then outlives the request that began it. That column is
the only thing that knows the job is happening, so the console reads it to lock
the unit — the area row drops its Editar link and `UnitEditor` refuses to render
the editor at all, because every word and question on screen is about to stop
existing and a save landing mid-replacement would be overwritten without a
trace. Both screens poll through `RegenerationWatch`; nothing pushes.

Consequences to keep in mind before touching it: the detached half runs with **no
request context**, so it must never reach for cookies, headers or `actor()` —
authorisation is settled by the caller. A process that dies mid-run leaves the
column set with nobody to clear it, which is why `regeneration.ts` treats a mark
older than `REGENERATION_STALE_MIN` as stale rather than as running. And a
deploy mid-job simply loses it: the unit unlocks itself ten minutes later with
its old content intact, since `replaceGeneratedUnit` writes in one transaction.

The review screen at `/unit/<id>/regenerate` is still the way to regenerate with
*different* inputs, and is the only caller of `regenerateUnit`.

## Accounts

There are two ways an account comes into being, and they differ in ways that
matter:

- **`inviteLearner` / `createOrgAdmin`** — an administrator creates it, the
  initial password *is* the person's own email, and `mustChangePassword` is
  true.
- **`createLearnerAccount`** (`actions/signup.ts`) — the learner registers
  themselves, chooses a 4-digit PIN, and `mustChangePassword` is **false**,
  because they picked the credential themselves. Public and unauthenticated:
  no `actor()` gate, a `P2002` catch around the create because the
  check-then-create race is real once anyone can call it, and the organisation
  is always re-resolved from the submitted code — never from an id in the form.

**Password rules are role-dependent.** A `LEARNER` uses exactly four digits; an
admin uses eight characters or more. The rules live in the pure `password.ts`
and are called from three places (signup, change, reset) — do not re-inline
them, which is how the old copy in `actions/auth.ts` had already drifted. Note
`resetPassword` cannot know the role until it consumes the token, and consuming
burns a single-use link, so it pre-checks what it can without the role first.

**Every organisation needs a join code.** It is how learners reach an org at
all, so all five creation paths — the console and four scripts — go through
`freeJoinCode` in `join-code.ts`. An org with a null code cannot be joined.
Registering with no code lands in the demo org named by
`PUBLIC_SIGNUP_ORG_SLUG`. Four digits is a deliberate, discussed trade: the
whole space can be walked, and that was accepted in exchange for a code someone
can read out over the phone.

**`Organization.isActive` is checked almost nowhere.** Deactivation works by
flipping every member's `User.isActive`, so a user created *afterwards* would
be active in a dead org. `public-data.ts` filters on it for exactly that
reason; anything new that resolves an org for an outsider must too.

## Billing

**A new learner gets 8 days, and the trial has no grace.** `TRIAL_DAYS` in
`billing-rules.ts`; `initialPaidThrough` applies it to both creation paths. The
5-day grace still exists, but only for an account that has paid before — being
late is a thing you can only be about a payment you owe.

**A trial reads as `TRIAL`, not `ACTIVE`.** It used to evaluate to ACTIVE the
moment `paidThrough` was in the future, which lost the distinction; the copy
needs it to say "three days left" rather than implying a subscription nobody
bought, and `evaluateStatus` needs it to know there is no grace to give.

**`SUSPENDED` is left by paying, never by waiting.** `evaluateStatus` returns
SUSPENDED unchanged rather than recomputing it against the grace window.
Without that, a trial suspended yesterday reads as PAST_DUE today — one day
overdue is inside the grace window — and PAST_DUE still has access, so the lock
silently undoes itself. There is a test for exactly this.

**Which screens survive a lock.** `learnerContext({ requireAccess: true })`
gates path, area, unit and practice. Leaderboard, payments and profile
deliberately do not — those three stay open so a locked learner can see what
they are missing and pay for it.

**`Organization.billingMode`.** `ORG_PAID` means the company is invoiced
outside the app: its learners always have access, the payments tab is gone from
the nav, `/payments` redirects to `/profile`, and the amount disappears from
the profile screen. What a company pays for its staff is not its staff's
business, so every money-shaped surface keys off `billing.orgPaid` rather than
each screen deciding for itself. The sweep skips those learners entirely.
`DISABLED` still outranks it — that is a hold on the individual.

**Declaring a payment unlocks immediately, before review.** Deliberate, and
re-confirmed after self-signup opened registration to anyone: the pending queue
is the control, so it has to actually be watched.

## Payments are still only half-reviewed

The lifecycle above is now exercised by `verify:billing` and the pure tests, but
the declare/confirm/reject flow underneath is **written but unreviewed** — treat
it as a draft, not as an invariant. That covers `billing-rules.ts`, `billing.ts`, `breb.ts`,
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

Sign-in counts consecutive failures on `User.failedSignIns` and **never blocks
on them** — there is nothing sensitive behind a learner account, and a lockout
costs more in support than it saves. Ten in a row writes one line to the server
log. Do not turn the counter into a gate without asking.

`ENFORCE_PASSWORD_CHANGE` is **off** for this phase at the owner's request, so
admin-created accounts keep their default password (the user's own email)
indefinitely. It does not touch self-registered learners, who set
`mustChangePassword: false` at creation. This is a deliberate, documented decision — see `lib/config.ts`.
Don't "fix" it; the flag turns the intended behaviour back on retroactively with
no migration.
