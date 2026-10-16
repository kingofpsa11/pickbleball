import type { Match, SetScore, SlotSource, StoreData, TournamentStatus } from '../../src/types.ts'

const idPattern = /^[A-Za-z0-9_-]{1,64}$/
const rankingKeys = new Set(['points', 'matchDiff', 'pointDiff', 'h2h', 'wins', 'setDiff'])
const tournamentStatus = new Set<TournamentStatus>(['upcoming', 'live', 'finished'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function text(value: unknown, max: number) {
  return typeof value === 'string' && value.length <= max
}

function whole(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function isSlot(value: unknown): value is SlotSource {
  if (!isRecord(value) || typeof value.kind !== 'string') return false
  if (value.kind === 'team') return text(value.teamId, 64)
  if (value.kind === 'winner' || value.kind === 'loser') return text(value.matchId, 64)
  if (value.kind === 'groupRank') return text(value.groupId, 64) && whole(value.rank, 1, 64)
  return false
}

function isSet(value: unknown): value is SetScore {
  return isRecord(value) && whole(value.a, 0, 99) && whole(value.b, 0, 99)
}

export function validateStore(data: StoreData) {
  if (data.version !== 5) return 'Phiên bản dữ liệu không đúng.'
  if (data.tournaments.length > 100 || data.players.length > 4000 || data.matches.length > 8000) {
    return 'Dữ liệu vượt quá mức cho một giải nội bộ.'
  }
  const tournamentIds = new Set<string>()
  for (const tournament of data.tournaments) {
    if (!idPattern.test(tournament.id) || tournamentIds.has(tournament.id)) return 'Mã giải không hợp lệ.'
    tournamentIds.add(tournament.id)
    if (!text(tournament.name, 120) || !tournament.name.trim()) return 'Tên giải không hợp lệ.'
    if (!text(tournament.venue, 120) || !text(tournament.city, 80) || !text(tournament.category, 40)) {
      return 'Thông tin giải không hợp lệ.'
    }
    if (!text(tournament.description, 2000)) return 'Nội dung giải quá dài.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tournament.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(tournament.endDate)) {
      return 'Ngày giải không hợp lệ.'
    }
    if (!tournamentStatus.has(tournament.status)) return 'Trạng thái giải không hợp lệ.'
    const config = tournament.config
    if (
      !whole(config.setsToWin, 1, 3) ||
      !whole(config.pointsForWin, 0, 20) ||
      !whole(config.pointsForLoss, 0, 20) ||
      !whole(config.pointsForForfeit, 0, 20) ||
      !whole(config.pointsPerSet, 1, 99) ||
      !Array.isArray(config.ranking) ||
      config.ranking.length < 1 ||
      config.ranking.some((key) => !rankingKeys.has(key))
    ) {
      return 'Luật tính điểm không hợp lệ.'
    }
  }

  const playerIds = new Set<string>()
  for (const player of data.players) {
    if (!idPattern.test(player.id) || playerIds.has(player.id)) return 'Mã vận động viên không hợp lệ.'
    playerIds.add(player.id)
    if (!tournamentIds.has(player.tournamentId) || !text(player.name, 80) || !player.name.trim()) {
      return 'Tên vận động viên không hợp lệ.'
    }
  }

  const teamIds = new Set<string>()
  for (const team of data.teams) {
    if (!idPattern.test(team.id) || teamIds.has(team.id)) return 'Mã đội không hợp lệ.'
    teamIds.add(team.id)
    if (!tournamentIds.has(team.tournamentId) || !text(team.name, 120)) return 'Tên đội không hợp lệ.'
    if (team.playerIds.length < 1 || team.playerIds.length > 4) return 'Số người trong đội không hợp lệ.'
    for (const playerId of team.playerIds) {
      const player = data.players.find((item) => item.id === playerId)
      if (!player || player.tournamentId !== team.tournamentId) return 'Đội đang gắn người không thuộc giải.'
    }
  }

  const groupIds = new Set<string>()
  for (const group of data.groups) {
    if (!idPattern.test(group.id) || groupIds.has(group.id)) return 'Mã bảng đấu không hợp lệ.'
    groupIds.add(group.id)
    if (!tournamentIds.has(group.tournamentId) || !text(group.name, 80)) return 'Bảng đấu không hợp lệ.'
    if (group.teamIds.some((teamId) => !teamIds.has(teamId))) return 'Bảng đấu chứa đội không tồn tại.'
  }

  const matchIds = new Set<string>()
  for (const match of data.matches) {
    if (!validMatch(match, tournamentIds, groupIds, matchIds)) return 'Trận đấu không hợp lệ.'
    matchIds.add(match.id)
  }
  return null
}

function validMatch(match: Match, tournamentIds: Set<string>, groupIds: Set<string>, matchIds: Set<string>) {
  if (!idPattern.test(match.id) || matchIds.has(match.id)) return false
  if (!tournamentIds.has(match.tournamentId)) return false
  if (match.stage !== 'group' && match.stage !== 'knockout') return false
  if (!text(match.roundLabel, 80) || !text(match.court, 40) || !text(match.scheduledAt, 40)) return false
  if (match.groupId && !groupIds.has(match.groupId)) return false
  if (!isSlot(match.slotA) || !isSlot(match.slotB)) return false
  if (match.forfeit && match.forfeit !== 'A' && match.forfeit !== 'B') return false
  if (!Array.isArray(match.sets) || match.sets.length > 5 || match.sets.some((set) => !isSet(set))) return false
  return match.status === 'scheduled' || match.status === 'live' || match.status === 'finished'
}
