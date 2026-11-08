import { withClient } from '@/lib/db'

export type Subscriber = {
  id: string
  email: string
  source: string
  createdAt: string
}

type SubscriberRow = {
  id: string
  email: string
  source: string
  created_at: Date
}

export async function listSubscribers(q?: string): Promise<{
  subscribers: Subscriber[]
  total: number
}> {
  return withClient(async (client) => {
    const params: unknown[] = []
    let where = ''
    if (q?.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`)
      where = `WHERE lower(email) LIKE $1`
    }

    const rows = await client.query<SubscriberRow>(
      `SELECT id, email, source, created_at
       FROM newsletter_subscribers
       ${where}
       ORDER BY created_at DESC
       LIMIT 1000`,
      params
    )
    const total = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM newsletter_subscribers`
    )

    return {
      subscribers: rows.rows.map((r) => ({
        id: r.id,
        email: r.email,
        source: r.source,
        createdAt: r.created_at.toISOString(),
      })),
      total: Number(total.rows[0]?.count ?? 0),
    }
  })
}

function csvCell(value: string) {
  // Quote, and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export async function subscribersCsv(): Promise<string> {
  return withClient(async (client) => {
    const rows = await client.query<SubscriberRow>(
      `SELECT id, email, source, created_at
       FROM newsletter_subscribers
       ORDER BY created_at DESC`
    )
    const lines = ['email,source,subscribed_at']
    for (const r of rows.rows) {
      lines.push(
        [csvCell(r.email), csvCell(r.source), csvCell(r.created_at.toISOString())].join(',')
      )
    }
    return lines.join('\r\n') + '\r\n'
  })
}
