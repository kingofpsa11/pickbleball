import type { StoreData } from '../types.ts'

export type RemoteState = { revision: number; data: StoreData }

async function readJson(response: Response) {
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('json')) return null
  return (await response.json()) as { revision?: unknown; data?: StoreData; signedIn?: unknown; error?: string }
}

export async function fetchRevision() {
  try {
    const response = await fetch('/api/revision', { cache: 'no-store', credentials: 'same-origin' })
    if (!response.ok) return null
    const body = await readJson(response)
    return typeof body?.revision === 'number' ? body.revision : null
  } catch {
    return null
  }
}

export async function fetchState(revision: number): Promise<RemoteState | null> {
  try {
    const response = await fetch(`/api/state?v=${revision}`, { cache: 'no-store', credentials: 'same-origin' })
    if (!response.ok) return null
    const body = await readJson(response)
    if (!body || typeof body.revision !== 'number' || !body.data) return null
    return { revision: body.revision, data: body.data }
  } catch {
    return null
  }
}

export async function fetchSession() {
  try {
    const response = await fetch('/api/admin/session', { cache: 'no-store', credentials: 'include' })
    if (!response.ok) return false
    const body = await readJson(response)
    return Boolean(body?.signedIn)
  } catch {
    return false
  }
}
