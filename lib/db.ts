import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

const globalForDb = globalThis as typeof globalThis & {
  adminPgPool?: Pool
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new DatabaseError(
      'DATABASE_URL is not set. Load it from the Stavarkling .env (admin-panel next.config does this) or add it to admin-panel/.env.local.'
    )
  }

  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: true,
  })
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function requireDatabaseUrl() {
  if (!hasDatabaseUrl()) {
    throw new DatabaseError(
      'DATABASE_URL is missing. Ensure stavarkling/.env (or .env.local) is present — admin-panel loads it automatically.'
    )
  }
}

export function getPool() {
  if (!globalForDb.adminPgPool) {
    globalForDb.adminPgPool = createPool()
  }
  return globalForDb.adminPgPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(text, params)
  } catch (err) {
    throw new DatabaseError('Database query failed', err)
  }
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  requireDatabaseUrl()
  let client: PoolClient
  try {
    client = await getPool().connect()
  } catch (err) {
    throw new DatabaseError(
      'Could not connect to Postgres. Check DATABASE_URL and network access.',
      err
    )
  }

  try {
    await client.query('SET statement_timeout = 8000')
    return await fn(client)
  } catch (err) {
    if (err instanceof DatabaseError) throw err
    throw new DatabaseError('Database operation failed', err)
  } finally {
    client.release()
  }
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withClient(async (client) => {
    await client.query('BEGIN')
    try {
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // ignore rollback errors
      }
      throw err
    }
  })
}

export async function checkDatabaseConnection(): Promise<{
  ok: boolean
  error?: string
}> {
  if (!hasDatabaseUrl()) {
    return { ok: false, error: 'DATABASE_URL is not set' }
  }
  try {
    await query('SELECT 1')
    return { ok: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown database connection error'
    return { ok: false, error: message }
  }
}

export function toPublicDbMessage(err: unknown) {
  if (err instanceof DatabaseError) return err.message
  if (err instanceof Error && err.message) return err.message
  return 'Unexpected database error'
}
