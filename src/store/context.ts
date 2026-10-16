import { createContext, useContext } from 'react'
import type { SetScore, Tournament, TournamentConfig, TournamentStatus } from '../types.ts'
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
}

export type NewPairInput = {
  tournamentId: string
  groupId: string | null
  playerA: string
  playerB: string
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
  notice: { id: number; text: string } | null
  updateMatch: (matchId: string, patch: MatchPatch, message?: string) => void
  clearScore: (matchId: string) => void
  updateTournament: (id: string, patch: Partial<Omit<Tournament, 'id' | 'config'>>) => void
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
