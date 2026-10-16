import { normalizeData } from '../../src/lib/results.ts'
import type { StoreData } from '../../src/types.ts'

export function mergeStores(current: StoreData, incoming: StoreData) {
  const tournamentIds = new Set(current.tournaments.map((item) => item.id))
  const playerIds = new Set(current.players.map((item) => item.id))
  const teamIds = new Set(current.teams.map((item) => item.id))
  let changed = false

  const tournaments = [...current.tournaments]
  for (const tournament of incoming.tournaments) {
    if (tournamentIds.has(tournament.id)) continue
    tournaments.push(tournament)
    tournamentIds.add(tournament.id)
    changed = true
  }

  const players = [...current.players]
  for (const player of incoming.players) {
    if (!tournamentIds.has(player.tournamentId) || playerIds.has(player.id)) continue
    players.push(player)
    playerIds.add(player.id)
    changed = true
  }

  const teams = [...current.teams]
  for (const team of incoming.teams) {
    if (!tournamentIds.has(team.tournamentId) || teamIds.has(team.id)) continue
    if (team.playerIds.some((id) => !playerIds.has(id))) continue
    teams.push(team)
    teamIds.add(team.id)
    changed = true
  }

  const groups = current.groups.map((group) => ({ ...group, teamIds: [...group.teamIds] }))
  for (const group of incoming.groups) {
    if (!tournamentIds.has(group.tournamentId)) continue
    const existing = groups.find((item) => item.id === group.id)
    const incomingTeams = group.teamIds.filter((id) => teamIds.has(id))
    if (!existing) {
      groups.push({ ...group, teamIds: incomingTeams })
      changed = true
      continue
    }
    for (const teamId of incomingTeams) {
      if (existing.teamIds.includes(teamId)) continue
      existing.teamIds.push(teamId)
      changed = true
    }
  }

  const matches = current.matches.map((match) => ({ ...match, sets: match.sets.map((set) => ({ ...set })) }))
  for (const match of incoming.matches) {
    if (!tournamentIds.has(match.tournamentId)) continue
    const existing = matches.find((item) => item.id === match.id)
    if (!existing) {
      matches.push(match)
      changed = true
      continue
    }
    if (existing.sets.length === 0 && !existing.forfeit && (match.sets.length > 0 || match.forfeit)) {
      existing.sets = match.sets.map((set) => ({ ...set }))
      existing.forfeit = match.forfeit
      changed = true
    }
  }

  if (!changed) return { data: current, changed: false }
  return {
    changed: true,
    data: normalizeData({ version: 5, tournaments, players, teams, groups, matches }),
  }
}
