import type { Group, Match, PairingMode, Team } from '../types.ts'
import { MAX_PLAYERS, championPlan } from './draw.ts'

export const pairingChoices: { id: PairingMode; label: string; detail: string }[] = [
  {
    id: 'fixed',
    label: 'Cặp cố định',
    detail: 'Bạn chọn sẵn hai người thành một đôi. Đôi này giữ nguyên suốt giải.',
  },
  {
    id: 'random-match',
    label: 'Cặp random từng trận',
    detail: 'Mỗi trận ghép lại hai người mới. Điểm tính cho từng người.',
  },
  {
    id: 'random-fixed',
    label: 'Cặp random cố định',
    detail: 'Máy ghép ngẫu nhiên một lần. Đôi đó giữ nguyên suốt giải.',
  },
  {
    id: 'split-random',
    label: 'Random từ 2 đội',
    detail: 'Chia sẵn Đội 1 và Đội 2. Mỗi trận lấy ngẫu nhiên 2 người mỗi đội để đấu.',
  },
]

export function pairingLabel(mode: PairingMode) {
  return pairingChoices.find((item) => item.id === mode)?.label ?? 'Cặp random cố định'
}

export function rosterBlockReason(playerCount: number) {
  if (playerCount < 4) return 'Cần ít nhất 4 người để tạo lịch.'
  if (playerCount % 2 === 1) return `Đang có ${playerCount} người. Cần số người chẵn.`
  if (playerCount > MAX_PLAYERS) return `Nhiều nhất ${MAX_PLAYERS} người cho một giải.`
  return null
}

type Draw = { teams: Team[]; groups: Group[]; matches: Match[]; summary: string }

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

function slotTime(date: string, slotIndex: number) {
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

function meetings(ids: string[]): [string, string][] {
  const pairs: [string, string][] = []
  for (let left = 0; left < ids.length; left += 1) {
    for (let right = left + 1; right < ids.length; right += 1) pairs.push([ids[left], ids[right]])
  }
  return pairs
}

function fairSlots(fixtures: [string, string][], ids: string[], courts: number) {
  const remaining = fixtures.map((pair) => [...pair] as [string, string])
  const last = new Map(ids.map((id) => [id, -99]))
  const streak = new Map(ids.map((id) => [id, 0]))
  const played = new Map(ids.map((id) => [id, 0]))
  const placed: { pair: [string, string]; slot: number; court: number }[] = []
  let slot = 0
  while (remaining.length > 0) {
    let chosen: [string, string][] = [remaining[0]]
    let bestScore = Number.NEGATIVE_INFINITY
    const scoreSet = (set: [string, string][]) => {
      const used = set.flat()
      if (new Set(used).size !== used.length) return Number.NEGATIVE_INFINITY
      let score = set.length * 30
      for (const id of used) {
        const rest = slot - (last.get(id) ?? -99)
        const run = streak.get(id) ?? 0
        score += Math.min(rest, 6) * 20
        score -= (played.get(id) ?? 0) * 3
        if (rest === 1) score -= 80 + run * 120
      }
      return score
    }
    for (let left = 0; left < remaining.length; left += 1) {
      const one = scoreSet([remaining[left]])
      if (one > bestScore) {
        bestScore = one
        chosen = [remaining[left]]
      }
      if (courts < 2) continue
      for (let right = left + 1; right < remaining.length; right += 1) {
        const two = scoreSet([remaining[left], remaining[right]])
        if (two > bestScore) {
          bestScore = two
          chosen = [remaining[left], remaining[right]]
        }
      }
    }
    const used = new Set(chosen.flat())
    for (const pair of chosen) {
      const index = remaining.findIndex((item) => item[0] === pair[0] && item[1] === pair[1])
      if (index >= 0) remaining.splice(index, 1)
    }
    chosen.forEach((pair, court) => {
      for (const id of pair) {
        const gap = slot - (last.get(id) ?? -99)
        streak.set(id, gap > 1 ? 1 : (streak.get(id) ?? 0) + 1)
        last.set(id, slot)
        played.set(id, (played.get(id) ?? 0) + 1)
      }
      placed.push({ pair, slot, court })
    })
    for (const id of ids) if (!used.has(id)) streak.set(id, 0)
    slot += 1
  }
  return placed
}

function partnerKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function rotatingFixtures(ids: string[], random: () => number) {
  const target = ids.length === 4 ? 3 : ids.length / 2 - 1
  const order = new Map(shuffle(ids, random).map((id, index) => [id, index]))
  const played = new Map(ids.map((id) => [id, 0]))
  const last = new Map(ids.map((id) => [id, -99]))
  const streak = new Map(ids.map((id) => [id, 0]))
  const partners = new Map<string, number>()
  const placed: { pair: [string, string]; slot: number; court: number }[] = []
  let slot = 0
  let guard = 0
  while ([...played.values()].some((count) => count < target) && guard < ids.length * target) {
    guard += 1
    const waiting = ids.filter((id) => (played.get(id) ?? 0) < target)
    const fresh = waiting.filter((id) => slot - (last.get(id) ?? -99) > 1)
    const source = fresh.length >= 4 ? fresh : waiting
    const ranked = [...source].sort((a, b) => {
      const load = (played.get(a) ?? 0) - (played.get(b) ?? 0)
      if (load !== 0) return load
      const rest = (last.get(a) ?? -99) - (last.get(b) ?? -99)
      if (rest !== 0) return rest
      const run = (streak.get(a) ?? 0) - (streak.get(b) ?? 0)
      if (run !== 0) return run
      return (order.get(a) ?? 0) - (order.get(b) ?? 0)
    })
    const capacity = fresh.length >= 12 ? 8 : 4
    const take = Math.min(capacity, ranked.length - (ranked.length % 4))
    if (take < 4) break
    const selected = ranked.slice(0, take)
    const used = new Set(selected)
    for (let index = 0; index < selected.length; index += 4) {
      const group = selected.slice(index, index + 4)
      const [sideA, sideB] = splitGroup(group, partners)
      const court = index / 4
      placed.push({ pair: [sideA.join('|'), sideB.join('|')], slot, court })
      for (const id of group) {
        const gap = slot - (last.get(id) ?? -99)
        streak.set(id, gap > 1 ? 1 : (streak.get(id) ?? 0) + 1)
        last.set(id, slot)
        played.set(id, (played.get(id) ?? 0) + 1)
      }
      partners.set(partnerKey(sideA[0], sideA[1]), (partners.get(partnerKey(sideA[0], sideA[1])) ?? 0) + 1)
      partners.set(partnerKey(sideB[0], sideB[1]), (partners.get(partnerKey(sideB[0], sideB[1])) ?? 0) + 1)
    }
    for (const id of ids) if (!used.has(id)) streak.set(id, 0)
    slot += 1
  }
  return placed.map((item) => ({
    a: item.pair[0].split('|'),
    b: item.pair[1].split('|'),
    slot: item.slot,
    court: item.court,
  }))
}

function splitGroup(group: string[], partners: Map<string, number>): [[string, string], [string, string]] {
  const [w, x, y, z] = group
  const options: [[string, string], [string, string]][] = [
    [[w, x], [y, z]],
    [[w, y], [x, z]],
    [[w, z], [x, y]],
  ]
  options.sort((left, right) => splitCost(left, partners) - splitCost(right, partners))
  return options[0]
}

function splitCost(option: [[string, string], [string, string]], partners: Map<string, number>) {
  return (
    (partners.get(partnerKey(option[0][0], option[0][1])) ?? 0) +
    (partners.get(partnerKey(option[1][0], option[1][1])) ?? 0)
  )
}

function teamOf(tournamentId: string, playerIds: string[], names: Map<string, string>, newId: () => string): Team {
  return {
    id: newId(),
    tournamentId,
    name: playerIds.map((id) => names.get(id) ?? '').filter(Boolean).join(' / '),
    playerIds,
  }
}

function pack(
  tournamentId: string,
  startDate: string,
  teams: Team[],
  fixtures: { a: string; b: string; slot: number; court: number }[],
  summary: string,
  newId: () => string,
): Draw {
  const groupId = newId()
  const groups: Group[] = [{ id: groupId, tournamentId, name: 'Bảng A', teamIds: teams.map((team) => team.id) }]
  const matches: Match[] = fixtures.map((fixture) => ({
    id: newId(),
    tournamentId,
    stage: 'group',
    roundLabel: 'Vòng bảng',
    groupId,
    court: fixture.court === 0 ? 'Sân 1' : 'Sân 2',
    scheduledAt: slotTime(startDate, fixture.slot),
    slotA: { kind: 'team', teamId: fixture.a },
    slotB: { kind: 'team', teamId: fixture.b },
    sets: [],
    status: 'scheduled',
  }))
  return { teams, groups, matches, summary }
}

export function buildPairSchedule(options: {
  tournamentId: string
  teams: Team[]
  startDate: string
  newId?: () => string
}): Draw {
  const newId = options.newId ?? (() => crypto.randomUUID())
  const ids = options.teams.map((team) => team.id)
  const placed = fairSlots(meetings(ids), ids, 2)
  return pack(
    options.tournamentId,
    options.startDate,
    options.teams,
    placed.map((item) => ({ a: item.pair[0], b: item.pair[1], slot: item.slot, court: item.court })),
    `${championPlan(options.teams.length)} Đôi vừa đánh được xếp nghỉ trước khi đánh tiếp.`,
    newId,
  )
}

export function buildRandomFixedSchedule(options: {
  tournamentId: string
  players: { id: string; name: string }[]
  startDate: string
  newId?: () => string
  random?: () => number
}): Draw {
  const newId = options.newId ?? (() => crypto.randomUUID())
  const random = options.random ?? Math.random
  const ordered = shuffle(options.players, random)
  const teams: Team[] = []
  for (let index = 0; index < ordered.length; index += 2) {
    teams.push(
      teamOf(
        options.tournamentId,
        [ordered[index].id, ordered[index + 1].id],
        new Map(options.players.map((player) => [player.id, player.name])),
        newId,
      ),
    )
  }
  return buildPairSchedule({ tournamentId: options.tournamentId, teams, startDate: options.startDate, newId })
}

export function buildRotatingSchedule(options: {
  tournamentId: string
  players: { id: string; name: string }[]
  startDate: string
  newId?: () => string
  random?: () => number
}): Draw {
  const newId = options.newId ?? (() => crypto.randomUUID())
  const names = new Map(options.players.map((player) => [player.id, player.name]))
  const rounds = rotatingFixtures(
    options.players.map((player) => player.id),
    options.random ?? Math.random,
  )
  const teams: Team[] = []
  const fixtures: { a: string; b: string; slot: number; court: number }[] = []
  for (const round of rounds) {
    const sideA = teamOf(options.tournamentId, round.a, names, newId)
    const sideB = teamOf(options.tournamentId, round.b, names, newId)
    teams.push(sideA, sideB)
    fixtures.push({ a: sideA.id, b: sideB.id, slot: round.slot, court: round.court })
  }
  const each = options.players.length === 4 ? 3 : options.players.length / 2 - 1
  return pack(
    options.tournamentId,
    options.startDate,
    teams,
    fixtures,
    `Mỗi trận ghép cặp mới. Mỗi người đánh ${each} trận. Người vừa đánh được nghỉ khi còn người khác.`,
    newId,
  )
}

function bestSquadPair(
  pool: string[],
  target: number,
  slot: number,
  played: Map<string, number>,
  last: Map<string, number>,
  streak: Map<string, number>,
  partners: Map<string, number>,
  order: Map<string, number>,
): [string, string] | null {
  const waiting = pool.filter((id) => (played.get(id) ?? 0) < target)
  let best: [string, string] | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (let left = 0; left < waiting.length; left += 1) {
    for (let right = left + 1; right < waiting.length; right += 1) {
      const pair: [string, string] = [waiting[left], waiting[right]]
      let score = 0
      for (const id of pair) {
        const rest = slot - (last.get(id) ?? -99)
        const run = streak.get(id) ?? 0
        score += Math.min(rest, 6) * 20
        score -= (played.get(id) ?? 0) * 5
        score -= (order.get(id) ?? 0) * 0.01
        if (rest === 1) score -= 80 + run * 120
      }
      score -= (partners.get(partnerKey(pair[0], pair[1])) ?? 0) * 30
      if (score > bestScore) {
        bestScore = score
        best = pair
      }
    }
  }
  return best
}

function splitFixtures(sideA: string[], sideB: string[], random: () => number) {
  const target = sideA.length === 2 ? 1 : sideA.length - 1
  const ids = [...sideA, ...sideB]
  const order = new Map(shuffle(ids, random).map((id, index) => [id, index]))
  const played = new Map(ids.map((id) => [id, 0]))
  const last = new Map(ids.map((id) => [id, -99]))
  const streak = new Map(ids.map((id) => [id, 0]))
  const partners = new Map<string, number>()
  const placed: { a: [string, string]; b: [string, string]; slot: number; court: number }[] = []
  let slot = 0
  let guard = 0
  while ([...played.values()].some((count) => count < target) && guard < sideA.length * target * 4) {
    guard += 1
    const firstA = bestSquadPair(sideA, target, slot, played, last, streak, partners, order)
    const firstB = bestSquadPair(sideB, target, slot, played, last, streak, partners, order)
    if (!firstA || !firstB) break
    const chosen: { a: [string, string]; b: [string, string]; court: number }[] = [{ a: firstA, b: firstB, court: 0 }]
    const secondA = bestSquadPair(
      sideA.filter((id) => !firstA.includes(id)),
      target,
      slot,
      played,
      last,
      streak,
      partners,
      order,
    )
    const secondB = bestSquadPair(
      sideB.filter((id) => !firstB.includes(id)),
      target,
      slot,
      played,
      last,
      streak,
      partners,
      order,
    )
    const secondPlayers = [...(secondA ?? []), ...(secondB ?? [])]
    if (
      secondA &&
      secondB &&
      secondPlayers.every((id) => slot - (last.get(id) ?? -99) !== 1)
    ) {
      chosen.push({ a: secondA, b: secondB, court: 1 })
    }
    const used = new Set(chosen.flatMap((item) => [...item.a, ...item.b]))
    for (const item of chosen) {
      placed.push({ a: item.a, b: item.b, slot, court: item.court })
      for (const pair of [item.a, item.b]) {
        const key = partnerKey(pair[0], pair[1])
        partners.set(key, (partners.get(key) ?? 0) + 1)
      }
    }
    for (const id of used) {
      const gap = slot - (last.get(id) ?? -99)
      streak.set(id, gap > 1 ? 1 : (streak.get(id) ?? 0) + 1)
      last.set(id, slot)
      played.set(id, (played.get(id) ?? 0) + 1)
    }
    for (const id of ids) if (!used.has(id)) streak.set(id, 0)
    slot += 1
  }
  return placed
}

export function buildSplitTeamSchedule(options: {
  tournamentId: string
  players: { id: string; name: string; squad: 1 | 2 }[]
  startDate: string
  newId?: () => string
  random?: () => number
}): Draw {
  const newId = options.newId ?? (() => crypto.randomUUID())
  const random = options.random ?? Math.random
  const names = new Map(options.players.map((player) => [player.id, player.name]))
  const sideA = shuffle(
    options.players.filter((player) => player.squad === 1).map((player) => player.id),
    random,
  )
  const sideB = shuffle(
    options.players.filter((player) => player.squad === 2).map((player) => player.id),
    random,
  )
  const rounds = splitFixtures(sideA, sideB, random)
  const teams: Team[] = []
  const fixtures: { a: string; b: string; slot: number; court: number }[] = []
  for (const round of rounds) {
    const home = teamOf(options.tournamentId, round.a, names, newId)
    const away = teamOf(options.tournamentId, round.b, names, newId)
    teams.push(home, away)
    fixtures.push({ a: home.id, b: away.id, slot: round.slot, court: round.court })
  }
  const each = sideA.length === 2 ? 1 : sideA.length - 1
  return pack(
    options.tournamentId,
    options.startDate,
    teams,
    fixtures,
    `Mỗi trận lấy 2 người mỗi đội. Mỗi người đánh ${each} trận. Người vừa đánh được nghỉ khi còn người khác.`,
    newId,
  )
}
