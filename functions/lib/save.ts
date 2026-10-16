import { normalizeData } from '../../src/lib/results.ts'
import type { StoreData } from '../../src/types.ts'
import type { D1Database } from './d1.ts'
import { claimRevision, readRevision, readState, runBatches, writeStatements } from './db.ts'
import { validateStore } from './validate.ts'

export async function saveStore(
  db: D1Database,
  expected: number,
  incoming: StoreData,
  actor: string,
  action: string,
  entityId: string,
  summary: string,
) {
  const data = normalizeData(incoming)
  const error = validateStore(data)
  if (error) return { ok: false as const, status: 400, error }
  const revision = await claimRevision(db, expected)
  if (revision == null) {
    const [currentRevision, current] = await Promise.all([readRevision(db), readState(db)])
    return { ok: false as const, status: 409, error: 'Có thay đổi mới hơn.', revision: currentRevision, data: current }
  }
  await runBatches(db, writeStatements(db, data, actor, action, entityId, summary))
  return { ok: true as const, status: 200, revision, data }
}
