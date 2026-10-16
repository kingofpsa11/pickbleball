export interface D1Result<T> {
  results?: T[]
  success: boolean
  meta: { changes?: number }
}

export interface D1Prepared {
  bind(...values: unknown[]): D1Prepared
  all<T>(): Promise<D1Result<T>>
  run(): Promise<D1Result<unknown>>
}

export interface D1Database {
  prepare(query: string): D1Prepared
  batch(statements: D1Prepared[]): Promise<D1Result<unknown>[]>
}

export interface Env {
  DB: D1Database
}

export function json(body: unknown, status = 200, cache = 'no-store') {
  return Response.json(body, {
    status,
    headers: { 'cache-control': cache },
  })
}

export async function readJson(request: Request) {
  const raw = await request.text()
  if (raw.length > 1_000_000) return { error: 'Dữ liệu quá lớn.' as const }
  try {
    return { value: JSON.parse(raw) as unknown }
  } catch {
    return { error: 'Dữ liệu gửi lên không đọc được.' as const }
  }
}
