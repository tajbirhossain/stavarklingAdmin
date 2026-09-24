import { hashRequestBody } from '@/lib/auth'
import { withClient } from '@/lib/db'

type CachedResponse = {
  status: number
  body: unknown
  replayed: boolean
}

/**
 * Stores successful mutating responses so retries with the same key
 * return the original result instead of applying the write twice.
 */
export async function runIdempotent(input: {
  adminId: string
  route: string
  idempotencyKey: string
  requestBody: unknown
  run: () => Promise<{ status: number; body: unknown }>
}): Promise<CachedResponse> {
  const requestHash = hashRequestBody(input.requestBody)

  const existing = await withClient(async (client) => {
    return client.query<{
      request_hash: string
      response_status: number
      response_body: unknown
    }>(
      `SELECT request_hash, response_status, response_body
       FROM admin_idempotency_keys
       WHERE admin_id = $1
         AND route = $2
         AND idempotency_key = $3
       LIMIT 1`,
      [input.adminId, input.route, input.idempotencyKey]
    )
  })

  if (existing.rows[0]) {
    const row = existing.rows[0]
    if (row.request_hash !== requestHash) {
      return {
        status: 409,
        body: {
          error: 'Idempotency-Key was reused with a different request body',
        },
        replayed: true,
      }
    }
    return {
      status: row.response_status,
      body: row.response_body,
      replayed: true,
    }
  }

  const result = await input.run()

  if (result.status < 500) {
    try {
      await withClient(async (client) => {
        await client.query(
          `INSERT INTO admin_idempotency_keys (
             admin_id, route, idempotency_key, request_hash, response_status, response_body
           ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
          [
            input.adminId,
            input.route,
            input.idempotencyKey,
            requestHash,
            result.status,
            JSON.stringify(result.body),
          ]
        )
      })
    } catch {
      const raced = await withClient(async (client) => {
        return client.query<{
          request_hash: string
          response_status: number
          response_body: unknown
        }>(
          `SELECT request_hash, response_status, response_body
           FROM admin_idempotency_keys
           WHERE admin_id = $1
             AND route = $2
             AND idempotency_key = $3
           LIMIT 1`,
          [input.adminId, input.route, input.idempotencyKey]
        )
      })

      if (raced.rows[0]) {
        const row = raced.rows[0]
        if (row.request_hash !== requestHash) {
          return {
            status: 409,
            body: {
              error: 'Idempotency-Key was reused with a different request body',
            },
            replayed: true,
          }
        }
        return {
          status: row.response_status,
          body: row.response_body,
          replayed: true,
        }
      }
    }
  }

  return { ...result, replayed: false }
}
