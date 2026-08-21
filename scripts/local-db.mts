/**
 * A real local Postgres for development and verification.
 *
 * `prisma dev` ships a lightweight shim that desyncs its wire protocol when
 * several queries are in flight, which surfaces as spurious empty results and
 * "bind message supplies N parameters" errors. This runs an actual Postgres
 * instead, so local behaviour matches Neon in production.
 *
 *   npm run db:start   # start (data persists in .postgres/)
 *   npm run db:stop    # stop
 */
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".postgres");
const PORT = 54329;
const USER = "palabria";
const PASSWORD = "palabria";
const DATABASE = "palabria";
// `prisma migrate dev` needs a throwaway database to diff migrations against.
const SHADOW = "palabria_shadow";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

const command = process.argv[2];

if (command === "start") {
  const fs = await import("node:fs");
  if (!fs.existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("initialising cluster in .postgres/ …");
    await pg.initialise();
  }
  await pg.start();
  for (const name of [DATABASE, SHADOW]) {
    try {
      await pg.createDatabase(name);
      console.log(`created database "${name}"`);
    } catch {
      // Already there — starting twice must be harmless.
    }
  }
  console.log(
    `postgres ready:\nDATABASE_URL="postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}"`,
  );
} else if (command === "stop") {
  await pg.stop();
  console.log("postgres stopped");
} else {
  console.error("usage: tsx scripts/local-db.mts <start|stop>");
  process.exit(1);
}
