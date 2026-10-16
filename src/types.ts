export type TournamentStatus = 'upcoming' | 'live' | 'finished'

export type MatchStatus = 'scheduled' | 'live' | 'finished'

export type RankingKey = 'points' | 'matchDiff' | 'pointDiff' | 'h2h' | 'wins' | 'setDiff'

export type TournamentConfig = {
  setsToWin: number
  pointsForWin: number
  pointsForLoss: number
  pointsForForfeit: number
  pointsPerSet: number
  ranking: RankingKey[]
}

export type Tournament = {
  id: string
  name: string
  venue: string
  city: string
  startDate: string
  endDate: string
  status: TournamentStatus
  category: string
  description: string
  config: TournamentConfig
  managedDraw?: boolean
}

export type Player = {
  id: string
  tournamentId: string
  name: string
}

export type Team = {
  id: string
  tournamentId: string
  name: string
  playerIds: string[]
}

export type Group = {
  id: string
  tournamentId: string
  name: string
  teamIds: string[]
}

export type SlotSource =
  | { kind: 'team'; teamId: string }
  | { kind: 'winner'; matchId: string }
  | { kind: 'loser'; matchId: string }
  | { kind: 'groupRank'; groupId: string; rank: number }

export type SetScore = {
  a: number
  b: number
}

export type Match = {
  id: string
  tournamentId: string
  stage: 'group' | 'knockout'
  roundLabel: string
  groupId?: string
  court: string
  scheduledAt: string
  slotA: SlotSource
  slotB: SlotSource
  sets: SetScore[]
  status: MatchStatus
  forfeit?: 'A' | 'B'
}

export type StoreData = {
  version: number
  tournaments: Tournament[]
  players: Player[]
  teams: Team[]
  groups: Group[]
  matches: Match[]
}
