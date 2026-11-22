import { Pool, type QueryResultRow } from "pg"

// The published app's host injects DATABASE_URL. It is not a Patreon secret and
// must not be copied into the repo or a NEXT_PUBLIC_ variable.
const globalPool = globalThis as unknown as { __camiliaPool?: Pool }

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS patreon_session (
  id text PRIMARY KEY,
  patreon_user_id text NOT NULL,
  full_name text,
  refresh_token text NOT NULL,
  access_token text NOT NULL,
  access_expires_at timestamptz NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  patron_status text,
  tier_title text,
  entitled jsonb NOT NULL DEFAULT '[]'::jsonb,
  academy_user_id text,
  academy_email text,
  updated_at timestamptz NOT NULL DEFAULT now()
)`,
  `ALTER TABLE patreon_session ADD COLUMN IF NOT EXISTS academy_user_id text`,
  `ALTER TABLE patreon_session ADD COLUMN IF NOT EXISTS academy_email text`,
  `CREATE TABLE IF NOT EXISTS patreon_media (
  id text PRIMARY KEY,
  kind text NOT NULL,
  name text NOT NULL,
  mime text NOT NULL,
  size bigint NOT NULL,
  duration double precision,
  tier_title text NOT NULL,
  tier_cents integer,
  bytes bytea,
  storage_path text,
  added_at timestamptz NOT NULL DEFAULT now()
)`,
  `ALTER TABLE patreon_media ADD COLUMN IF NOT EXISTS storage_path text`,
  `ALTER TABLE patreon_media ALTER COLUMN bytes DROP NOT NULL`,
  `ALTER TABLE patreon_media ALTER COLUMN size TYPE bigint`,
]

let schema: Promise<void> | null = null

function connectionString() {
  const value = (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || "").trim()
  return value.length > 0 ? value : null
}

export function sslForDatabase(url: string) {
  if (/@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(url) || url.includes("sslmode=disable")) return undefined
  // Supabase's pooler certificate is not in Node's trust store. Verifying it
  // closes the connection before the library can be read.
  if (/supabase\.(co|com)/i.test(url)) return { rejectUnauthorized: false }
  return { rejectUnauthorized: true }
}

function poolConfig(url: string) {
  return {
    connectionString: url,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: sslForDatabase(url),
  }
}

export function databaseUrl() {
  return connectionString()
}

export function getPool() {
  const url = connectionString()
  if (!url) return null
  if (!globalPool.__camiliaPool) globalPool.__camiliaPool = new Pool(poolConfig(url))
  return globalPool.__camiliaPool
}

export function logDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "database error"
  console.error("patreon library", message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted"))
}

export async function dbQuery<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const pool = getPool()
  if (!pool) return null
  if (!schema) {
    schema = (async () => {
      for (const statement of SCHEMA) await pool.query(statement)
    })().catch((error: unknown) => {
      schema = null
      throw error
    })
  }
  await schema
  return pool.query<T>(text, values)
}
