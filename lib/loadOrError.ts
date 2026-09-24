import { toPublicDbMessage } from '@/lib/db'

export async function loadOrError<T>(
  load: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await load()
    return { ok: true, data }
  } catch (err) {
    console.error(err)
    return { ok: false, error: toPublicDbMessage(err) }
  }
}
