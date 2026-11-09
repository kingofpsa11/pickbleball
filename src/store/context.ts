import { createContext, useContext } from 'react'
import type { PairingMode, SetScore, Tournament, TournamentConfig, TournamentStatus } from '../types.ts'
import type { StoreData } from '../types.ts'

export type NewTournamentInput = {
  name: string
  venue: string
  city: string
  startDate: string
  endDate: string
  category: string
  description: string
  playerNames: string[]
  pointsPerSet: 11 | 15
  winByTwo: boolean
  pairingMode: PairingMode
}

export type NewPairInput = {
  tournamentId: string
  groupId: string | null
  playerA: string
  playerB: string
}

export type MemberInput = {
  names: string[]
  pairingMode: PairingMode
  pairs: [number, number][]
  squads: (0 | 1 | 2)[]
}

export type NewMatchInput = {
  tournamentId: string
  stage: 'group' | 'knockout'
  roundLabel: string
  groupId?: string
  court: string
  scheduledAt: string
  teamAId: string
  teamBId: string
}

export type MatchPatch = {
  sets: SetScore[]
  court: string
  scheduledAt: string
  forfeit: 'A' | 'B' | null
}

export type StoreApi = {
  data: StoreData
  source: 'local' | 'remote'
  notice: { id: number; text: string } | null
  updateMatch: (matchId: string, patch: MatchPatch, message?: string) => void
  clearScore: (matchId: string) => void
  updateTournament: (id: string, patch: Partial<Omit<Tournament, 'id'>>) => void
  setTournamentStatus: (id: string, status: TournamentStatus) => void
  updateConfig: (id: string, patch: Partial<TournamentConfig>) => void
  addTournament: (input: NewTournamentInput) => string
  addPlayer: (tournamentId: string, name: string) => boolean
  removePlayer: (playerId: string) => boolean
  startTournament: (tournamentId: string) => string | null
  redrawTournament: (tournamentId: string) => string | null
  addGroup: (tournamentId: string, name: string) => boolean
  addPair: (input: NewPairInput) => void
  updatePlayer: (playerId: string, name: string) => void
  savePlayersAndRedraw: (tournamentId: string, names: string[]) => string | null
  saveMembers: (tournamentId: string, input: MemberInput) => string | null
  createSchedule: (tournamentId: string) => string | null
  deleteTournament: (id: string) => void
  addMatch: (input: NewMatchInput) => boolean
  resetDemo: () => void
}

export const TournamentContext = createContext<StoreApi | null>(null)

export function useTournamentStore() {
  const value = useContext(TournamentContext)
  if (!value) throw new Error('useTournamentStore phải nằm trong StoreProvider')
  return value
}
