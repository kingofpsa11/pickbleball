import { writeFileSync } from 'node:fs'
import { SEED } from '../src/data/seed.ts'

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function sqlNullable(value) {
  if (value == null || value === '') return 'NULL'
  return sqlText(value)
}

const lines = [
  '-- Dữ liệu giải mẫu cho database local, cùng nội dung với src/data/seed.ts.',
  '-- Không dùng làm migration production. Không chứa tài khoản quản trị.',
  'PRAGMA foreign_keys = ON;',
  '',
]

for (const tournament of SEED.tournaments) {
  lines.push(
    `INSERT INTO tournaments (id, name, venue, city, start_date, end_date, status, category, description, sets_to_win, points_for_win, points_for_loss, points_for_forfeit, points_per_set, ranking_json, managed_draw) VALUES (${[
      sqlText(tournament.id),
      sqlText(tournament.name),
      sqlText(tournament.venue),
      sqlText(tournament.city),
      sqlText(tournament.startDate),
      sqlText(tournament.endDate),
      sqlText(tournament.status),
      sqlText(tournament.category),
      sqlText(tournament.description),
      tournament.config.setsToWin,
      tournament.config.pointsForWin,
      tournament.config.pointsForLoss,
      tournament.config.pointsForForfeit,
      tournament.config.pointsPerSet,
      sqlText(JSON.stringify(tournament.config.ranking)),
      tournament.managedDraw ? 1 : 0,
    ].join(', ')});`,
  )
}

for (const player of SEED.players) {
  lines.push(
    `INSERT INTO players (id, tournament_id, name) VALUES (${sqlText(player.id)}, ${sqlText(player.tournamentId)}, ${sqlText(player.name)});`,
  )
}

for (const team of SEED.teams) {
  lines.push(
    `INSERT INTO teams (id, tournament_id, name) VALUES (${sqlText(team.id)}, ${sqlText(team.tournamentId)}, ${sqlText(team.name)});`,
  )
  team.playerIds.forEach((playerId, index) => {
    lines.push(
      `INSERT INTO team_players (team_id, player_id, sort_order) VALUES (${sqlText(team.id)}, ${sqlText(playerId)}, ${index});`,
    )
  })
}

for (const group of SEED.groups) {
  lines.push(
    `INSERT INTO groups (id, tournament_id, name) VALUES (${sqlText(group.id)}, ${sqlText(group.tournamentId)}, ${sqlText(group.name)});`,
  )
  group.teamIds.forEach((teamId, index) => {
    lines.push(
      `INSERT INTO group_teams (group_id, team_id, sort_order) VALUES (${sqlText(group.id)}, ${sqlText(teamId)}, ${index});`,
    )
  })
}

for (const match of SEED.matches) {
  lines.push(
    `INSERT INTO matches (id, tournament_id, stage, round_label, group_id, court, scheduled_at, slot_a_json, slot_b_json, status, forfeit) VALUES (${[
      sqlText(match.id),
      sqlText(match.tournamentId),
      sqlText(match.stage),
      sqlText(match.roundLabel),
      sqlNullable(match.groupId),
      sqlText(match.court),
      sqlText(match.scheduledAt),
      sqlText(JSON.stringify(match.slotA)),
      sqlText(JSON.stringify(match.slotB)),
      sqlText(match.status),
      sqlNullable(match.forfeit),
    ].join(', ')});`,
  )
  match.sets.forEach((set, index) => {
    lines.push(
      `INSERT INTO match_sets (match_id, set_index, score_a, score_b) VALUES (${sqlText(match.id)}, ${index}, ${set.a}, ${set.b});`,
    )
  })
}

lines.push(`UPDATE meta SET value = '1' WHERE key = 'revision';`)
lines.push('')

writeFileSync(new URL('../scripts/local-seed.sql', import.meta.url), lines.join('\n'), 'utf8')
console.log(
  JSON.stringify({
    tournaments: SEED.tournaments.length,
    players: SEED.players.length,
    teams: SEED.teams.length,
    groups: SEED.groups.length,
    matches: SEED.matches.length,
  }),
)
