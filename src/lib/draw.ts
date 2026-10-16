import type { Group, Match, Team } from '../types.ts'

export const MAX_PLAYERS = 32

export function parseParticipantNames(text: string) {
  return text
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function startBlockReason(playerCount: number, alreadyStarted: boolean) {
  if (alreadyStarted) return 'Giải đã được ghép đôi.'
  if (playerCount < 4) return 'Cần ít nhất 4 người để ghép thành 2 đội.'
  if (playerCount % 2 === 1) return `Đang có ${playerCount} người. Cần số người chẵn để mỗi đội đúng 2 người.`
  if (playerCount > MAX_PLAYERS) return `Nhiều nhất ${MAX_PLAYERS} người cho một giải tự xếp lịch.`
  return null
}

export function championPlan(teamCount: number) {
  if (teamCount <= 1) return 'Chưa đủ đội để thi đấu.'
  if (teamCount === 2) return 'Hai đội gặp nhau một set. Đội thắng là vô địch.'
  return 'Tất cả các đội ở một bảng. Mỗi đội chỉ gặp nhau một set. Đội đứng nhất khi đấu xong là vô địch.'
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swap]
    copy[swap] = current
  }
  return copy
}

function roundRobin(ids: string[]) {
  const row = [...ids]
  if (row.length % 2 === 1) row.push('')
  const total = row.length
  const pairs: [string, string][] = []
  for (let round = 0; round < total - 1; round += 1) {
    for (let index = 0; index < total / 2; index += 1) {
      const home = row[index]
      const away = row[total - 1 - index]
      if (home && away) pairs.push([home, away])
    }
    const fixed = row[0]
    const rotating = row.slice(1)
    rotating.unshift(rotating.pop() ?? '')
    row.splice(0, row.length, fixed, ...rotating)
  }
  return pairs
}

function clock(date: string, slotIndex: number) {
  const [year, month, day] = date.split('-').map(Number)
  const totalMinutes = 8 * 60 + slotIndex * 45
  const extraDays = Math.floor(totalMinutes / (24 * 60))
  const minuteOfDay = totalMinutes % (24 * 60)
  const stamp = new Date(Date.UTC(year, month - 1, day + extraDays))
  const yyyy = stamp.getUTCFullYear()
  const mm = String(stamp.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(stamp.getUTCDate()).padStart(2, '0')
  const hour = String(Math.floor(minuteOfDay / 60)).padStart(2, '0')
  const minute = String(minuteOfDay % 60).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hour}:${minute}:00+07:00`
}

export function buildDraw(options: {
  tournamentId: string
  players: { id: string; name: string }[]
  startDate: string
  endDate: string
  newId?: () => string
  random?: () => number
}) {
  const tournamentId = options.tournamentId
  const newId = options.newId ?? (() => crypto.randomUUID())
  const random = options.random ?? Math.random
  const ordered = shuffle(options.players, random)
  const teams: Team[] = []
  for (let index = 0; index < ordered.length; index += 2) {
    const left = ordered[index]
    const right = ordered[index + 1]
    teams.push({
      id: newId(),
      tournamentId,
      name: `${left.name} / ${right.name}`,
      playerIds: [left.id, right.id],
    })
  }

  const summary = championPlan(teams.length)
  const groups: Group[] = [
    {
      id: newId(),
      tournamentId,
      name: 'Bảng A',
      teamIds: teams.map((team) => team.id),
    },
  ]
  const matches: Match[] = []
  let slot = 0
  for (const [teamA, teamB] of roundRobin(groups[0].teamIds)) {
    const court = slot % 2 === 0 ? 'Sân 1' : 'Sân 2'
    const scheduledAt = clock(options.startDate, Math.floor(slot / 2))
    slot += 1
    matches.push({
      id: newId(),
      tournamentId,
      stage: 'group',
      roundLabel: 'Vòng bảng',
      groupId: groups[0].id,
      court,
      scheduledAt,
      slotA: { kind: 'team', teamId: teamA },
      slotB: { kind: 'team', teamId: teamB },
      sets: [],
      status: 'scheduled',
    })
  }
  return { teams, groups, matches, summary }
}
