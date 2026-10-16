import type {
  Match,
  MatchStatus,
  Player,
  RankingKey,
  SetScore,
  SlotSource,
  StoreData,
  Team,
  TournamentConfig,
} from '../types.ts'

export const RANKING_LABEL: Record<RankingKey, string> = {
  points: 'tổng điểm',
  matchDiff: 'hiệu số trận thắng – thua',
  pointDiff: 'hiệu số điểm ghi – điểm thua',
  h2h: 'đối đầu trực tiếp',
  wins: 'số trận thắng',
  setDiff: 'hiệu số set',
}

export type ResolvedSlot = {
  teamId: string | null
  projected: boolean
  label: string
}

export type StandingRow = {
  teamId: string
  played: number
  wins: number
  losses: number
  setsWon: number
  setsLost: number
  pointsWon: number
  pointsLost: number
  points: number
  forfeits: number
  rank: number
}

export type MatchView = {
  match: Match
  sideA: ResolvedSlot
  sideB: ResolvedSlot
  setWins: { a: number; b: number }
  winnerId: string | null
}

const standingStack = new Set<string>()

function pending(label: string): ResolvedSlot {
  return { teamId: null, projected: false, label }
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(99, Math.round(value)))
}

export function cleanSets(sets: SetScore[]) {
  if (!Array.isArray(sets)) return []
  return sets
    .filter((set) => set && Number.isFinite(set.a) && Number.isFinite(set.b))
    .map((set) => ({ a: clampScore(set.a), b: clampScore(set.b) }))
    .filter((set) => set.a > 0 || set.b > 0)
}

export function countSetWins(sets: SetScore[]) {
  let a = 0
  let b = 0
  for (const set of sets) {
    if (set.a > set.b) a += 1
    else if (set.b > set.a) b += 1
  }
  return { a, b }
}

export function draftScore(raw: string) {
  if (raw === '') return ''
  const digits = raw.replace(/\D/g, '').slice(0, 2)
  if (digits === '') return ''
  return String(Number(digits))
}

export function parseScore(raw: string) {
  if (raw.trim() === '') return 0
  const value = Number(raw)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(99, Math.trunc(value)))
}

export function setIsComplete(set: SetScore, pointsPerSet: number) {
  const high = Math.max(set.a, set.b)
  return high >= pointsPerSet && Math.abs(set.a - set.b) >= 2
}

export function statusFromSets(
  sets: SetScore[],
  setsToWin: number,
  forfeit?: 'A' | 'B',
  pointsPerSet = 11,
): MatchStatus {
  if (forfeit === 'A' || forfeit === 'B') return 'finished'
  const played = sets.filter((set) => set.a > 0 || set.b > 0)
  if (played.length === 0) return 'scheduled'
  if (setsToWin <= 1) {
    const set = played[0]
    if (!set || set.a === set.b || !setIsComplete(set, pointsPerSet)) return 'live'
    return 'finished'
  }
  const wins = countSetWins(played)
  if ((wins.a >= setsToWin || wins.b >= setsToWin) && wins.a !== wins.b) return 'finished'
  return 'live'
}

export function normalizeData(data: StoreData): StoreData {
  return {
    ...data,
    matches: data.matches.map((match) => {
      const tournament = data.tournaments.find((item) => item.id === match.tournamentId)
      const forfeit = match.forfeit === 'A' || match.forfeit === 'B' ? match.forfeit : undefined
      const setsToWin = tournament?.config.setsToWin ?? 1
      const pointsPerSet = tournament?.config.pointsPerSet ?? 11
      const sets = forfeit ? [] : cleanSets(match.sets).slice(0, setsToWin <= 1 ? 1 : undefined)
      return {
        ...match,
        sets,
        forfeit,
        status: statusFromSets(sets, setsToWin, forfeit, pointsPerSet),
      }
    }),
  }
}

function placeLabel(rank: number, groupName: string) {
  if (rank === 1) return `Nhất ${groupName}`
  if (rank === 2) return `Nhì ${groupName}`
  return `Hạng ${rank} ${groupName}`
}

export function pairTitle(names: string[]) {
  return names.map((name) => name.trim()).filter(Boolean).join(' / ')
}

function teamLabel(data: StoreData, teamId: string | null, fallback: string) {
  if (!teamId) return fallback
  const team = data.teams.find((item) => item.id === teamId)
  if (!team) return fallback
  const members = pairNames(team, data.players)
  return members || team.name || fallback
}

function resolveSlot(slot: SlotSource, data: StoreData, stack: Set<string>): ResolvedSlot {
  if (slot.kind === 'team') {
    return {
      teamId: slot.teamId,
      projected: false,
      label: teamLabel(data, slot.teamId, 'Đôi'),
    }
  }

  if (slot.kind === 'groupRank') {
    const group = data.groups.find((item) => item.id === slot.groupId)
    if (!group) return pending('Chờ vòng bảng')
    const table = standingsForGroup(group.id, data)
    const row = table[slot.rank - 1]
    const groupMatches = data.matches.filter((match) => match.groupId === group.id)
    const done = groupMatches.filter((match) => match.status === 'finished').length
    const complete = groupMatches.length > 0 && done === groupMatches.length
    const fallback = placeLabel(slot.rank, group.name)
    if (row && complete) {
      return { teamId: row.teamId, projected: false, label: teamLabel(data, row.teamId, fallback) }
    }
    if (row && done > 0) {
      return { teamId: row.teamId, projected: true, label: teamLabel(data, row.teamId, fallback) }
    }
    return pending(fallback)
  }

  if (stack.has(slot.matchId)) return pending('Chờ trận trước')
  const source = data.matches.find((match) => match.id === slot.matchId)
  if (!source) return pending('Chờ trận trước')
  const round = source.roundLabel.toLowerCase()
  const waiting = pending(slot.kind === 'winner' ? `Thắng ${round}` : `Thua ${round}`)
  const next = new Set(stack)
  next.add(source.id)
  const sourceSides = {
    sideA: resolveSlot(source.slotA, data, next),
    sideB: resolveSlot(source.slotB, data, next),
  }
  if (
    source.status !== 'finished' ||
    sourceSides.sideA.projected ||
    sourceSides.sideB.projected ||
    !sourceSides.sideA.teamId ||
    !sourceSides.sideB.teamId
  ) {
    return waiting
  }
  const wins = countSetWins(source.sets)
  if (wins.a === wins.b) return waiting
  const winnerId = wins.a > wins.b ? sourceSides.sideA.teamId : sourceSides.sideB.teamId
  const loserId = winnerId === sourceSides.sideA.teamId ? sourceSides.sideB.teamId : sourceSides.sideA.teamId
  const teamId = slot.kind === 'winner' ? winnerId : loserId
  return { teamId, projected: false, label: teamLabel(data, teamId, waiting.label) }
}

function sidesOf(match: Match, data: StoreData, stack: Set<string>) {
  const next = new Set(stack)
  next.add(match.id)
  return {
    sideA: resolveSlot(match.slotA, data, next),
    sideB: resolveSlot(match.slotB, data, next),
  }
}

export function getSides(match: Match, data: StoreData) {
  return sidesOf(match, data, new Set())
}

export function winnerTeamId(match: Match, data: StoreData) {
  if (match.status !== 'finished') return null
  const sides = getSides(match, data)
  if (!sides.sideA.teamId || !sides.sideB.teamId || sides.sideA.projected || sides.sideB.projected) return null
  if (match.forfeit === 'A') return sides.sideB.teamId
  if (match.forfeit === 'B') return sides.sideA.teamId
  const wins = countSetWins(match.sets)
  if (wins.a === wins.b) return null
  return wins.a > wins.b ? sides.sideA.teamId : sides.sideB.teamId
}

export function viewMatch(match: Match, data: StoreData): MatchView {
  const sides = getSides(match, data)
  return {
    match,
    sideA: sides.sideA,
    sideB: sides.sideB,
    setWins: countSetWins(match.sets),
    winnerId: winnerTeamId(match, data),
  }
}

export function canEnterScore(match: Match, data: StoreData) {
  const sides = getSides(match, data)
  return Boolean(sides.sideA.teamId && sides.sideB.teamId && !sides.sideA.projected && !sides.sideB.projected)
}

export function teamsAlreadyMeet(tournamentId: string, teamAId: string, teamBId: string, data: StoreData) {
  return data.matches.some((match) => {
    if (match.tournamentId !== tournamentId) return false
    const sides = getSides(match, data)
    if (!sides.sideA.teamId || !sides.sideB.teamId || sides.sideA.projected || sides.sideB.projected) return false
    const ids = [sides.sideA.teamId, sides.sideB.teamId]
    return ids.includes(teamAId) && ids.includes(teamBId)
  })
}

export function tournamentChampion(tournamentId: string, data: StoreData) {
  const matches = data.matches.filter((match) => match.tournamentId === tournamentId)
  const finalMatch = matches.find((match) => match.roundLabel === 'Chung kết' && match.status === 'finished')
  if (finalMatch) {
    const winnerId = winnerTeamId(finalMatch, data)
    return data.teams.find((team) => team.id === winnerId) ?? null
  }
  const groups = data.groups.filter((group) => group.tournamentId === tournamentId)
  if (groups.length !== 1) return null
  const groupMatches = matches.filter((match) => match.groupId === groups[0].id)
  if (groupMatches.length === 0 || groupMatches.some((match) => match.status !== 'finished')) return null
  const table = standingsForGroup(groups[0].id, data)
  const top = table[0]
  if (!top || (table[1] && table[1].rank === top.rank)) return null
  return data.teams.find((team) => team.id === top.teamId) ?? null
}

function emptyRow(teamId: string): StandingRow {
  return {
    teamId,
    played: 0,
    wins: 0,
    losses: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    points: 0,
    forfeits: 0,
    rank: 0,
  }
}

function criterionDelta(key: RankingKey, a: StandingRow, b: StandingRow, matches: Match[], data: StoreData) {
  if (key === 'points') return b.points - a.points
  if (key === 'matchDiff') return b.wins - b.losses - (a.wins - a.losses)
  if (key === 'wins') return b.wins - a.wins
  if (key === 'setDiff') return b.setsWon - b.setsLost - (a.setsWon - a.setsLost)
  if (key === 'pointDiff') return b.pointsWon - b.pointsLost - (a.pointsWon - a.pointsLost)
  const direct = matches.find((match) => {
    const sides = getSides(match, data)
    const ids = [sides.sideA.teamId, sides.sideB.teamId]
    return ids.includes(a.teamId) && ids.includes(b.teamId)
  })
  if (!direct) return 0
  const winner = winnerTeamId(direct, data)
  if (winner === a.teamId) return -1
  if (winner === b.teamId) return 1
  return 0
}

export function standingsForGroup(groupId: string, data: StoreData) {
  if (standingStack.has(groupId)) return []
  const group = data.groups.find((item) => item.id === groupId)
  const tournament = data.tournaments.find((item) => item.id === group?.tournamentId)
  if (!group || !tournament) return []

  standingStack.add(groupId)
  try {
    const config = tournament.config
    const rows = new Map(group.teamIds.map((teamId) => [teamId, emptyRow(teamId)]))
    const finished = data.matches.filter((match) => match.groupId === groupId && match.status === 'finished')
    for (const match of finished) {
      const sides = getSides(match, data)
      if (!sides.sideA.teamId || !sides.sideB.teamId || sides.sideA.projected || sides.sideB.projected) continue
      const rowA = rows.get(sides.sideA.teamId)
      const rowB = rows.get(sides.sideB.teamId)
      if (!rowA || !rowB) continue
      if (match.forfeit === 'A' || match.forfeit === 'B') {
        const aWon = match.forfeit === 'B'
        rowA.played += 1
        rowB.played += 1
        rowA.wins += aWon ? 1 : 0
        rowA.losses += aWon ? 0 : 1
        rowB.wins += aWon ? 0 : 1
        rowB.losses += aWon ? 1 : 0
        rowA.forfeits += aWon ? 0 : 1
        rowB.forfeits += aWon ? 1 : 0
        rowA.points += aWon ? config.pointsForWin : config.pointsForForfeit
        rowB.points += aWon ? config.pointsForForfeit : config.pointsForWin
        continue
      }
      const wins = countSetWins(match.sets)
      if (wins.a === wins.b) continue
      const aWon = wins.a > wins.b
      rowA.played += 1
      rowB.played += 1
      rowA.wins += aWon ? 1 : 0
      rowA.losses += aWon ? 0 : 1
      rowB.wins += aWon ? 0 : 1
      rowB.losses += aWon ? 1 : 0
      rowA.points += aWon ? config.pointsForWin : config.pointsForLoss
      rowB.points += aWon ? config.pointsForLoss : config.pointsForWin
      rowA.setsWon += wins.a
      rowA.setsLost += wins.b
      rowB.setsWon += wins.b
      rowB.setsLost += wins.a
      for (const set of match.sets) {
        rowA.pointsWon += set.a
        rowA.pointsLost += set.b
        rowB.pointsWon += set.b
        rowB.pointsLost += set.a
      }
    }

    const sorted = [...rows.values()].sort((a, b) => {
      for (const key of config.ranking) {
        const delta = criterionDelta(key, a, b, finished, data)
        if (delta !== 0) return delta
      }
      return 0
    })

    sorted.forEach((row, index) => {
      if (index === 0) {
        row.rank = 1
        return
      }
      const previous = sorted[index - 1]
      const tied = config.ranking.every((key) => criterionDelta(key, previous, row, finished, data) === 0)
      row.rank = tied ? previous.rank : index + 1
    })
    return sorted
  } finally {
    standingStack.delete(groupId)
  }
}

export function rulesLines(config: TournamentConfig) {
  const format =
    config.setsToWin <= 1
      ? `Mỗi đội chỉ gặp nhau một set. Set đến ${config.pointsPerSet}, cần hơn đối thủ 2 điểm.`
      : `Thắng ${config.setsToWin} set thì thắng trận (tối đa ${config.setsToWin * 2 - 1} set). Mỗi set đến ${config.pointsPerSet}, cần hơn đối thủ 2 điểm.`
  return [
    `Thắng ${config.pointsForWin} điểm, thua ${config.pointsForLoss} điểm, bỏ cuộc ${config.pointsForForfeit} điểm.`,
    'Đôi có tổng điểm cao hơn thì xếp trên.',
    'Nếu bằng điểm, xét hiệu số trận thắng – thua, rồi hiệu số điểm ghi – điểm thua, rồi đối đầu trực tiếp.',
    format,
  ]
}

export function pairNames(team: Team | undefined, players: Player[]) {
  if (!team) return ''
  return team.playerIds
    .map((id) => players.find((player) => player.id === id)?.name ?? '')
    .filter(Boolean)
    .join(' / ')
}

function bySchedule<T extends Pick<Match, 'id' | 'scheduledAt' | 'court'>>(a: T, b: T) {
  return a.scheduledAt.localeCompare(b.scheduledAt) || a.court.localeCompare(b.court, 'vi') || a.id.localeCompare(b.id)
}

export function firstUnfinishedMatch<T extends Pick<Match, 'id' | 'status' | 'scheduledAt' | 'court'>>(matches: T[]) {
  return [...matches].sort(bySchedule).find((match) => match.status !== 'finished') ?? null
}

export function currentAndNextMatches<T extends Pick<Match, 'id' | 'status' | 'scheduledAt' | 'court'>>(matches: T[]) {
  const ordered = [...matches].sort(bySchedule)
  const index = ordered.findIndex((match) => match.status !== 'finished')
  if (index < 0) return []
  return ordered.slice(index, index + 2)
}

export function countResults(matches: Match[]) {
  return {
    total: matches.length,
    done: matches.filter((match) => match.status === 'finished').length,
    live: firstUnfinishedMatch(matches) ? 1 : 0,
  }
}
