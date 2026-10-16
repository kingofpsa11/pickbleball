import { normalizeData } from '../../src/lib/results.ts'
import type { Group, Match, Player, RankingKey, SetScore, SlotSource, StoreData, Team, Tournament, TournamentStatus } from '../../src/types.ts'
import type { D1Database, D1Prepared } from './d1.ts'

type TournamentRow = {
  id: string
  name: string
  venue: string
  city: string
  start_date: string
  end_date: string
  status: TournamentStatus
  category: string
  description: string
  sets_to_win: number
  points_for_win: number
  points_for_loss: number
  points_for_forfeit: number
  points_per_set: number
  ranking_json: string
  managed_draw: number
}

type PlayerRow = { id: string; tournament_id: string; name: string }
type TeamRow = { id: string; tournament_id: string; name: string }
type TeamPlayerRow = { team_id: string; player_id: string; sort_order: number }
type GroupRow = { id: string; tournament_id: string; name: string }
type GroupTeamRow = { group_id: string; team_id: string; sort_order: number }
type MatchRow = {
  id: string
  tournament_id: string
  stage: 'group' | 'knockout'
  round_label: string
  group_id: string | null
  court: string
  scheduled_at: string
  slot_a_json: string
  slot_b_json: string
  status: Match['status']
  forfeit: 'A' | 'B' | null
}
type SetRow = { match_id: string; set_index: number; score_a: number; score_b: number }

function rows<T>(result: { results?: T[] }) {
  return result.results ?? []
}

export async function readRevision(db: D1Database) {
  const result = await db.prepare(`SELECT value FROM meta WHERE key = 'revision'`).all<{ value: string }>()
  return Number(rows(result)[0]?.value ?? 0)
}

export async function readState(db: D1Database): Promise<StoreData> {
  const [tournamentRows, playerRows, teamRows, teamPlayerRows, groupRows, groupTeamRows, matchRows, setRows] =
    await db.batch([
      db.prepare(
        `SELECT id, name, venue, city, start_date, end_date, status, category, description,
                sets_to_win, points_for_win, points_for_loss, points_for_forfeit, points_per_set,
                ranking_json, managed_draw
         FROM tournaments
         ORDER BY start_date, id`,
      ),
      db.prepare(`SELECT id, tournament_id, name FROM players ORDER BY id`),
      db.prepare(`SELECT id, tournament_id, name FROM teams ORDER BY id`),
      db.prepare(`SELECT team_id, player_id, sort_order FROM team_players ORDER BY team_id, sort_order`),
      db.prepare(`SELECT id, tournament_id, name FROM groups ORDER BY id`),
      db.prepare(`SELECT group_id, team_id, sort_order FROM group_teams ORDER BY group_id, sort_order`),
      db.prepare(
        `SELECT id, tournament_id, stage, round_label, group_id, court, scheduled_at, slot_a_json, slot_b_json, status, forfeit
         FROM matches
         ORDER BY scheduled_at, court, id`,
      ),
      db.prepare(`SELECT match_id, set_index, score_a, score_b FROM match_sets ORDER BY match_id, set_index`),
    ])

  const playersByTeam = new Map<string, string[]>()
  for (const row of rows(teamPlayerRows as { results?: TeamPlayerRow[] })) {
    const list = playersByTeam.get(row.team_id) ?? []
    list.push(row.player_id)
    playersByTeam.set(row.team_id, list)
  }
  const teamsByGroup = new Map<string, string[]>()
  for (const row of rows(groupTeamRows as { results?: GroupTeamRow[] })) {
    const list = teamsByGroup.get(row.group_id) ?? []
    list.push(row.team_id)
    teamsByGroup.set(row.group_id, list)
  }
  const setsByMatch = new Map<string, SetScore[]>()
  for (const row of rows(setRows as { results?: SetRow[] })) {
    const list = setsByMatch.get(row.match_id) ?? []
    list.push({ a: row.score_a, b: row.score_b })
    setsByMatch.set(row.match_id, list)
  }

  const tournaments: Tournament[] = rows(tournamentRows as { results?: TournamentRow[] }).map((row) => ({
    id: row.id,
    name: row.name,
    venue: row.venue,
    city: row.city,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    category: row.category,
    description: row.description,
    managedDraw: row.managed_draw === 1 ? true : undefined,
    config: {
      setsToWin: row.sets_to_win,
      pointsForWin: row.points_for_win,
      pointsForLoss: row.points_for_loss,
      pointsForForfeit: row.points_for_forfeit,
      pointsPerSet: row.points_per_set,
      ranking: JSON.parse(row.ranking_json) as RankingKey[],
    },
  }))
  const players: Player[] = rows(playerRows as { results?: PlayerRow[] }).map((row) => ({
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
  }))
  const teams: Team[] = rows(teamRows as { results?: TeamRow[] }).map((row) => ({
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    playerIds: playersByTeam.get(row.id) ?? [],
  }))
  const groups: Group[] = rows(groupRows as { results?: GroupRow[] }).map((row) => ({
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    teamIds: teamsByGroup.get(row.id) ?? [],
  }))
  const matches: Match[] = rows(matchRows as { results?: MatchRow[] }).map((row) => ({
    id: row.id,
    tournamentId: row.tournament_id,
    stage: row.stage,
    roundLabel: row.round_label,
    groupId: row.group_id ?? undefined,
    court: row.court,
    scheduledAt: row.scheduled_at,
    slotA: JSON.parse(row.slot_a_json) as SlotSource,
    slotB: JSON.parse(row.slot_b_json) as SlotSource,
    sets: setsByMatch.get(row.id) ?? [],
    status: row.status,
    forfeit: row.forfeit ?? undefined,
  }))

  return normalizeData({ version: 5, tournaments, players, teams, groups, matches })
}

export function writeStatements(
  db: D1Database,
  data: StoreData,
  actor: string,
  action: string,
  entityId: string,
  summary: string,
) {
  const statements: D1Prepared[] = [
    db.prepare(`DELETE FROM match_sets`),
    db.prepare(`DELETE FROM matches`),
    db.prepare(`DELETE FROM group_teams`),
    db.prepare(`DELETE FROM groups`),
    db.prepare(`DELETE FROM team_players`),
    db.prepare(`DELETE FROM teams`),
    db.prepare(`DELETE FROM players`),
    db.prepare(`DELETE FROM tournaments`),
  ]
  for (const tournament of data.tournaments) {
    statements.push(
      db
        .prepare(
          `INSERT INTO tournaments (
             id, name, venue, city, start_date, end_date, status, category, description,
             sets_to_win, points_for_win, points_for_loss, points_for_forfeit, points_per_set,
             ranking_json, managed_draw
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          tournament.id,
          tournament.name,
          tournament.venue,
          tournament.city,
          tournament.startDate,
          tournament.endDate,
          tournament.status,
          tournament.category,
          tournament.description,
          tournament.config.setsToWin,
          tournament.config.pointsForWin,
          tournament.config.pointsForLoss,
          tournament.config.pointsForForfeit,
          tournament.config.pointsPerSet,
          JSON.stringify(tournament.config.ranking),
          tournament.managedDraw ? 1 : 0,
        ),
    )
  }
  for (const player of data.players) {
    statements.push(
      db.prepare(`INSERT INTO players (id, tournament_id, name) VALUES (?, ?, ?)`).bind(player.id, player.tournamentId, player.name),
    )
  }
  for (const team of data.teams) {
    statements.push(
      db.prepare(`INSERT INTO teams (id, tournament_id, name) VALUES (?, ?, ?)`).bind(team.id, team.tournamentId, team.name),
    )
    team.playerIds.forEach((playerId, index) => {
      statements.push(
        db
          .prepare(`INSERT INTO team_players (team_id, player_id, sort_order) VALUES (?, ?, ?)`)
          .bind(team.id, playerId, index),
      )
    })
  }
  for (const group of data.groups) {
    statements.push(
      db.prepare(`INSERT INTO groups (id, tournament_id, name) VALUES (?, ?, ?)`).bind(group.id, group.tournamentId, group.name),
    )
    group.teamIds.forEach((teamId, index) => {
      statements.push(
        db.prepare(`INSERT INTO group_teams (group_id, team_id, sort_order) VALUES (?, ?, ?)`).bind(group.id, teamId, index),
      )
    })
  }
  for (const match of data.matches) {
    statements.push(
      db
        .prepare(
          `INSERT INTO matches (
             id, tournament_id, stage, round_label, group_id, court, scheduled_at,
             slot_a_json, slot_b_json, status, forfeit
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          match.id,
          match.tournamentId,
          match.stage,
          match.roundLabel,
          match.groupId ?? null,
          match.court,
          match.scheduledAt,
          JSON.stringify(match.slotA),
          JSON.stringify(match.slotB),
          match.status,
          match.forfeit ?? null,
        ),
    )
    match.sets.forEach((set, index) => {
      statements.push(
        db
          .prepare(`INSERT INTO match_sets (match_id, set_index, score_a, score_b) VALUES (?, ?, ?, ?)`)
          .bind(match.id, index, set.a, set.b),
      )
    })
  }
  statements.push(
    db
      .prepare(`INSERT INTO audit_log (actor, action, entity_id, summary, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(actor, action, entityId, summary, new Date().toISOString()),
  )
  return statements
}

export async function runBatches(db: D1Database, statements: D1Prepared[]) {
  const size = 40
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size))
  }
}

export async function claimRevision(db: D1Database, expected: number) {
  const next = expected + 1
  const result = await db
    .prepare(`UPDATE meta SET value = ? WHERE key = 'revision' AND value = ?`)
    .bind(String(next), String(expected))
    .run()
  return result.meta.changes === 1 ? next : null
}
