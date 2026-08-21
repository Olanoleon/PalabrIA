# PalabrIA

A multi-tenant vocabulary-learning platform. Learners work through short units of
six or so words — cards, a contextual reading paragraph, then practice — while
administrators build the curriculum with AI assistance.

Three roles:

- **Learner** — the product itself: a mobile-first, gamified path through
  vocabulary areas and units.
- **Organization Admin** — manages one organization's learners and curriculum.
- **Super Admin** — manages organizations, the Global Template, payments and
  platform settings, and can enter any organization's content environment.

The learner UI is a faithful port of the Claude Design source
(`Lexica Learner v2.dc.html`); where the design and the PRD disagreed, the design
won, except for the unlock threshold, which is **70%** per the PRD.

## Stack

Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS v4 ·
Prisma 6 + PostgreSQL (Neon in production) · OpenAI for unit generation ·
Resend for transactional email · deployed on Railway.

## Getting started

```bash
npm install
npm run db:start     # real local Postgres in .postgres/ (keep this running)
npm run db:deploy    # apply migrations
npm run db:seed      # global template, two organizations, demo learners
npm run dev
```

Then open http://localhost:3000. Seeded accounts (the password is the email):

| Role | Email |
| --- | --- |
| Super Admin | `super@palabria.app` |
| Org Admin | `admin@arkusnexus.com` |
| Learner | `ana.rueda@arkusnexus.com` |
| Learner (suspended) | `diego.marquez@arkusnexus.com` |

Admin accounts require a 2FA code emailed via Resend. Without `RESEND_API_KEY`
the code is printed to the server log in development.

`npm run db:start` runs an actual PostgreSQL server rather than `prisma dev`,
whose lightweight shim desynchronises its wire protocol under concurrent
queries — which shows up as spurious empty results.

## Environment

See `.env.example`. In production every value comes from Railway environment
variables; `OPENAI_API_KEY` and `RESEND_API_KEY` are read only in server modules
and never reach the browser.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`) |
| `DIRECT_URL` | Neon **direct** string — `prisma migrate` cannot use the pooler |
| `SHADOW_DATABASE_URL` | Only needed for `prisma migrate dev` |
| `AUTH_SECRET` | Signs the session cookie (32+ characters) |
| `CRON_SECRET` | Shared secret for `/api/cron/billing` |
| `OPENAI_API_KEY` | AI unit and area generation |
| `RESEND_API_KEY` | 2FA codes, invitations, password resets |
| `RESEND_FROM` | Optional. Defaults to Resend's own verified sender; set it after verifying your domain |
| `APP_URL` | Absolute base for links in emails |

## Deployment

Creating the tables in Neon is written up step by step in
[`docs/NEON.md`](docs/NEON.md), including the pooled-vs-direct URL trap and a
paste-into-the-console fallback (`prisma/neon-bootstrap.sql`). The short version:
set `DATABASE_URL` and `DIRECT_URL`, then `npm run db:deploy`.

Railway builds with `npm run build` and starts with `npm run start:migrate`,
which applies migrations before serving. `/api/health` is the health check and
touches the database, so a deploy that cannot reach Neon fails rather than
serving broken pages.

Add one Railway cron job, daily:

```bash
curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" "$APP_URL/api/cron/billing"
```

It moves lapsed learners to `PAST_DUE` and then to `SUSPENDED` once the grace
period runs out. It is idempotent, so a retried run is harmless.

## How the pieces fit

```
src/lib/
  scope.ts          tenant scoping — the one place that decides who sees what
  rbac.ts           request-bound wrappers over scope.ts
  auth.ts           sessions, passwords, one-time codes
  xp.ts             XP formula, level curve, streaks
  unlock.ts         unit progression
  progress.ts       grades a practice run and awards XP, badges, streaks
  billing-rules.ts  pure payment lifecycle
  billing.ts        payment operations and the daily sweep
  breb.ts           Bre-B key handling and QR rendering
  unit-schema.ts    shape of an AI-generated unit
  unit-validate.ts  validation of a generated unit before saving
  openai.ts         the generation call itself (server only)
  replicate.ts      Global Template -> organization copy
  i18n.ts           the design's ES/EN dictionary
```

### XP and levels

Unit XP is score-scaled and difficulty-scaled with a best-score ratchet: each
unit has a lifetime target set by the learner's best score, and an attempt pays
only the difference between that target and what has already been awarded.
Improving always pays, exactly once; a worse retry pays nothing and never lowers
the record. Levels follow `220 · (n−1)^1.6`, so bands widen from 220 XP to
roughly 740 XP.

### Content model

A single Global Template is seeded. Creating an organization deep-copies it into
independent `scope: ORG` rows. After that the copy is its own: organization edits
never touch the template or another organization, and template edits apply only
to organizations created afterwards.

### Payments

There is no payment-provider webhook in this version. The learner scans a
platform-wide Bre-B QR, pays in their bank app, then declares it — access
extends immediately, and the declaration lands in the Super Admin's queue.
Rejecting one restores the exact expiry it replaced. Administrators can also
force `OVERRIDE_ACTIVE` or `DISABLED`, which the daily sweep leaves alone.

## Checks

```bash
npm run typecheck        # tsc
npm test                 # 74 unit tests (XP, billing rules, unlock, scope, validation)
npm run verify           # integration checks against the running database
```

`npm run verify` runs three suites: `verify:progress` (grading, the XP ratchet,
unlocks, badges), `verify:billing` (the lifecycle, declarations, rejection
rollback, overrides) and `verify:isolation` (the PRD's mandatory tenant and
template independence rules).

## Not in this version

- The Avatar tab is visible but disabled, pending a choice of AI avatar service.
- Global Templates cannot be created from the UI; one is seeded.
- Payments are collected out of band, so confirmation is manual.
