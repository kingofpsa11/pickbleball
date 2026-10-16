import { currentAdmin } from '../../lib/auth.ts'
import { json, type Env } from '../../lib/d1.ts'

const formatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export async function onRequestGet(context: { request: Request; env: Env }) {
  const admin = await currentAdmin(context.env.DB, context.request)
  if (!admin) return json({ error: 'Cần đăng nhập ban tổ chức.' }, 401)
  const result = await context.env.DB
    .prepare(
      `SELECT id, actor, summary, created_at FROM audit_log ORDER BY id DESC LIMIT 20`,
    )
    .all<{ id: number; actor: string; summary: string; created_at: string }>()
  const rows = (result.results ?? []).map((row) => ({
    id: row.id,
    actor: row.actor,
    summary: row.summary,
    createdAt: formatter.format(new Date(row.created_at)),
  }))
  return json({ rows })
}
