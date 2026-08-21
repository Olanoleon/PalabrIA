# Creating the PalabrIA tables in Neon

The schema is 17 tables, 9 enum types, 23 indexes and 20 foreign keys. It is
already captured as two Prisma migrations, so you do not write any SQL by hand.

There are two paths. **Use path A.** Path B exists only for the case where you
cannot run the CLI against Neon and have to paste SQL into the Neon console.

---

## 1. Create the Neon project

1. Sign in at <https://console.neon.tech> and click **New Project**.
2. Name it `palabria`, pick the region closest to your Railway region (for
   Colombia, `AWS us-east-1` or `us-east-2`), and keep the default Postgres
   version.
3. Neon creates a database called `neondb`. Either use it, or open
   **Branches → main → Databases → New Database** and create one named
   `palabria`. Both work; just be consistent below.

## 2. Copy both connection strings

Open **Dashboard → Connect** (or **Connection Details**) for the `main` branch.
You need **two** strings, and the difference matters:

| Neon toggle | Host looks like | Put it in | Used for |
| --- | --- | --- | --- |
| **Pooled connection** on | `ep-xxx-**pooler**.region.aws.neon.tech` | `DATABASE_URL` | the running app |
| **Pooled connection** off | `ep-xxx.region.aws.neon.tech` | `DIRECT_URL` | `prisma migrate` |

Migrations must use the direct string: Neon's pooler runs PgBouncer in
transaction mode, which cannot hold the advisory locks and session state Prisma
needs for DDL. Keep `?sslmode=require` on both.

## 3. Point your environment at it

Locally, in `.env` (never commit it):

```bash
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.us-east-2.aws.neon.tech/palabria?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx.us-east-2.aws.neon.tech/palabria?sslmode=require"
SHADOW_DATABASE_URL=""
```

On Railway, set the same two variables on the service. `SHADOW_DATABASE_URL` is
only needed to *author* new migrations; `migrate deploy` never touches it.

Confirm you are pointed at the right place before writing anything:

```bash
npm run db:check
```

It prints the target with the password redacted, the Postgres version, and
`application tables: 0 of 17 present` on a fresh database.

---

## Path A — apply the migrations (recommended)

```bash
npm run db:deploy     # prisma migrate deploy — creates everything
npm run db:status     # should say: Database schema is up to date!
npm run db:check      # 17 of 17 tables, both migrations recorded
```

That is the whole job. `db:deploy` is idempotent: running it again reports
"No pending migrations to apply."

Optionally load the demo content — one Global Template with two areas (three
Very Easy units and two Hard units), two organizations, and the seeded users:

```bash
npm run db:seed
```

**Do not run `db:seed` against a production database with real learners.** It
clears the demo tables first. It is meant for a fresh environment.

### Railway does this for you

The service starts with `npm run start:migrate`, which runs `prisma migrate
deploy` before `next start`. So the tables are created on first deploy as long
as `DATABASE_URL` and `DIRECT_URL` are set. Path A by hand is only for when you
want the schema in place *before* deploying.

---

## Path B — paste SQL into the Neon SQL Editor

Use this only if you cannot reach Neon from a terminal.

1. Open `prisma/neon-bootstrap.sql` (regenerate it any time with
   `npm run db:sql`).
2. In the Neon console open **SQL Editor**, select the `palabria` database,
   paste the whole file, and **Run**.
3. **Then tell Prisma the migrations are already applied**, or the next deploy
   will try to create everything again and fail:

```bash
npx prisma migrate resolve --applied 20260821075046_init
npx prisma migrate resolve --applied 20260821084311_payment_previous_period
npm run db:status     # Database schema is up to date!
```

Step 3 is the part that is easy to forget. `npm run db:check` warns you about it
by reporting `_prisma_migrations: absent`.

The file assumes an **empty** database — it does not use `IF NOT EXISTS` on
tables, so re-running it errors rather than silently diverging.

---

## Adding a table later

Never edit the database by hand. Change `prisma/schema.prisma`, then:

```bash
npm run db:migrate -- --name what_you_changed   # authors + applies locally
git add prisma/migrations
```

`db:migrate` needs a shadow database. Against local Postgres that is already
configured. Against Neon, create a second database on the branch (say
`palabria_shadow`) and set `SHADOW_DATABASE_URL` to its **direct** string —
or, better, author migrations locally and let Railway apply them on deploy.

Deploying is then just `npm run db:deploy`, which Railway already does.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `prepared statement "s0" already exists` | Prisma is talking to the pooler | Set `DIRECT_URL` to the non-pooler host |
| `Error: P1001 Can't reach database server` | Neon compute is suspended, or the IP is not allowed | Retry once (Neon wakes on connect); check **Settings → IP Allow** |
| `advisory lock` timeout during migrate | Migrating through the pooler | Same as the first row |
| `db:status` lists migrations as not applied, but the tables exist | Schema was applied via Path B | Run the two `migrate resolve --applied` commands |
| `The table "public.User" does not exist` at runtime | Migrations never ran on this database | `npm run db:deploy` |
| Learner screens are empty after deploy | Schema is there but no content | `npm run db:seed`, or create an organization from `/super` |

## What gets created

```
Organization  User            Learner        PlatformSettings
AuthToken     Payment         BillingAudit
GlobalTemplate  Area          Unit           Word            Activity
UnitProgress  ActivityAttempt XpLedger       Badge           LearnerBadge
```

Enums: `Role`, `UiLang`, `BillingStatus`, `ReviewState`, `AreaScope`,
`Difficulty`, `ActivityType`, `XpReason`, `TokenPurpose`.
