/**
 * Inspects whatever database DATABASE_URL points at and reports whether the
 * schema is in place. Safe to run against Neon: it only reads.
 *
 *   npm run db:check
 */
import "dotenv/config";
import { Client } from "pg";

const EXPECTED_TABLES = [
  "Activity",
  "ActivityAttempt",
  "Area",
  "AuthToken",
  "Badge",
  "BillingAudit",
  "GlobalTemplate",
  "Learner",
  "LearnerBadge",
  "Organization",
  "Payment",
  "PlatformSettings",
  "Unit",
  "UnitProgress",
  "User",
  "Word",
  "XpLedger",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// Show where we are pointing without ever printing the password.
const redacted = url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:****@");
console.log(`target: ${redacted}\n`);

const client = new Client({ connectionString: url });
try {
  await client.connect();
} catch (error) {
  console.error(`cannot connect: ${(error as Error).message}`);
  process.exit(1);
}

// A single pg Client cannot run queries concurrently, so these are serial.
const version = await client.query<{ v: string }>("SELECT version() AS v");
const tables = await client.query<{ table_name: string }>(
  `SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`,
);
const migrations = await client
  .query<{ migration_name: string; finished_at: Date | null }>(
    `SELECT migration_name, finished_at FROM "_prisma_migrations"
      ORDER BY started_at`,
  )
  .catch(() => null);

console.log(version.rows[0].v.split(" ").slice(0, 2).join(" "));

const present = new Set(tables.rows.map((r) => r.table_name));
const missing = EXPECTED_TABLES.filter((name) => !present.has(name));
const found = EXPECTED_TABLES.length - missing.length;

console.log(
  `\napplication tables: ${found} of ${EXPECTED_TABLES.length} present`,
);
if (missing.length) {
  console.log(`missing: ${missing.join(", ")}`);
} else {
  console.log("every expected table is present");
}

if (!migrations) {
  console.log(
    "\n_prisma_migrations: absent — the schema was applied by raw SQL, or not at all.",
  );
  console.log(
    "  If you applied prisma/neon-bootstrap.sql by hand, run the two",
    "`prisma migrate resolve --applied` commands in its header.",
  );
} else {
  console.log("\nmigrations recorded:");
  for (const row of migrations.rows) {
    console.log(
      `  ${row.finished_at ? "✔" : "…"} ${row.migration_name}${row.finished_at ? "" : " (unfinished)"}`,
    );
  }
}

// Row counts for the tables that tell you whether the seed ran.
if (!missing.length) {
  const counts = await client.query<{
    orgs: number;
    users: number;
    areas: number;
    units: number;
    words: number;
  }>(`SELECT
        (SELECT count(*) FROM "Organization")::int AS orgs,
        (SELECT count(*) FROM "User")::int AS users,
        (SELECT count(*) FROM "Area")::int AS areas,
        (SELECT count(*) FROM "Unit")::int AS units,
        (SELECT count(*) FROM "Word")::int AS words`);
  const row = counts.rows[0];
  console.log(
    `\ncontent: ${row.orgs} organizations · ${row.users} users · ${row.areas} areas · ${row.units} units · ${row.words} words`,
  );
  if (row.users === 0) console.log("  empty — run `npm run db:seed`");
}

await client.end();
