import { currentAdmin } from '../../lib/auth.ts'
import { json, readJson, type Env } from '../../lib/d1.ts'
import { saveStore } from '../../lib/save.ts'
import type { StoreData } from '../../../src/types.ts'

const labels: Record<string, string> = {
  updateMatch: 'Cập nhật tỷ số',
  clearScore: 'Xóa tỷ số',
  updateTournament: 'Sửa thông tin giải',
  setTournamentStatus: 'Đổi trạng thái giải',
  updateConfig: 'Sửa luật tính điểm',
  addTournament: 'Tạo giải',
  addPlayer: 'Thêm vận động viên',
  removePlayer: 'Bỏ vận động viên',
  startTournament: 'Ghép cặp và xếp lịch',
  redrawTournament: 'Xếp lại cặp',
  addGroup: 'Thêm bảng đấu',
  addPair: 'Thêm đôi',
  savePlayersAndRedraw: 'Tạo lại cặp và lịch',
  updatePlayer: 'Sửa tên vận động viên',
  addMatch: 'Thêm trận',
  deleteTournament: 'Xóa giải',
  resetDemo: 'Khôi phục dữ liệu mẫu',
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const admin = await currentAdmin(context.env.DB, context.request)
  if (!admin) return json({ error: 'Cần đăng nhập ban tổ chức.' }, 401)
  const body = await readJson(context.request)
  if ('error' in body) return json({ error: body.error }, 400)
  const record = body.value
  if (!record || typeof record !== 'object') return json({ error: 'Thiếu dữ liệu.' }, 400)
  const payload = record as { expectedRevision?: unknown; action?: unknown; entityId?: unknown; data?: unknown }
  if (typeof payload.expectedRevision !== 'number' || !Number.isInteger(payload.expectedRevision)) {
    return json({ error: 'Thiếu phiên bản dữ liệu.' }, 400)
  }
  const action = typeof payload.action === 'string' && labels[payload.action] ? payload.action : ''
  if (!action) return json({ error: 'Thao tác không được phép.' }, 400)
  const entityId = typeof payload.entityId === 'string' && /^[A-Za-z0-9_-]{0,64}$/.test(payload.entityId) ? payload.entityId : ''
  if (!payload.data || typeof payload.data !== 'object') return json({ error: 'Thiếu dữ liệu giải.' }, 400)
  const saved = await saveStore(
    context.env.DB,
    payload.expectedRevision,
    payload.data as StoreData,
    admin.username,
    action,
    entityId,
    labels[action] ?? action,
  )
  if (!saved.ok) return json(saved.status === 409 ? saved : { error: saved.error }, saved.status)
  return json({ revision: saved.revision, data: saved.data })
}
