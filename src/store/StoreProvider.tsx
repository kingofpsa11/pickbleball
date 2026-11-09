import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { SEED } from '../data/seed.ts'
import { fetchRevision, fetchSession, fetchState } from '../lib/api.ts'
import { organizerSignedIn, setAuthMode, watchOrganizerAuth } from '../lib/auth.ts'
import { buildDraw, championPlan, startBlockReason } from '../lib/draw.ts'
import { buildPairSchedule, buildRandomFixedSchedule, buildRotatingSchedule, rosterBlockReason } from '../lib/schedule.ts'
import { cleanSets, normalizeData, pairTitle, statusFromSets, teamsAlreadyMeet } from '../lib/results.ts'
import type { StoreData, TournamentConfig } from '../types.ts'
import { TournamentContext } from './context.ts'
import type { MatchPatch, MemberInput, NewMatchInput, NewPairInput, NewTournamentInput, StoreApi } from './context.ts'
import type { PairingMode, TournamentStatus } from '../types.ts'

const STORAGE_KEY = 'pickleball-results-store-v1'
const DELETED_KEY = 'pickleball-results-deleted-ids'

const defaultConfig = (): TournamentConfig => ({
  setsToWin: 1,
  pointsForWin: 2,
  pointsForLoss: 1,
  pointsForForfeit: 0,
  pointsPerSet: 11,
  winByTwo: true,
  ranking: ['points', 'matchDiff', 'pointDiff', 'h2h'],
})

function parseStored(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Partial<StoreData>
    if (
      parsed.version !== 5 ||
      !Array.isArray(parsed.tournaments) ||
      !Array.isArray(parsed.players) ||
      !Array.isArray(parsed.teams) ||
      !Array.isArray(parsed.groups) ||
      !Array.isArray(parsed.matches)
    ) {
      return null
    }
    return normalizeData(parsed as StoreData)
  } catch {
    return null
  }
}

function withoutTournaments(data: StoreData, ids: Set<string>): StoreData {
  if (ids.size === 0) return data
  return normalizeData({
    ...data,
    tournaments: data.tournaments.filter((item) => !ids.has(item.id)),
    players: data.players.filter((item) => !ids.has(item.tournamentId)),
    teams: data.teams.filter((item) => !ids.has(item.tournamentId)),
    groups: data.groups.filter((item) => !ids.has(item.tournamentId)),
    matches: data.matches.filter((item) => !ids.has(item.tournamentId)),
  })
}

function deletedIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DELETED_KEY) ?? '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function rememberDeleted(id: string) {
  const ids = deletedIds()
  if (!ids.includes(id)) ids.push(id)
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify(ids.slice(-200)))
  } catch {
    // Trình duyệt có thể chặn lưu. Máy chủ vẫn từ chối khôi phục giải đã xóa.
  }
}

function dropStoredTournament(id: string) {
  rememberDeleted(id)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? parseStored(raw) : null
    if (!stored) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutTournaments(stored, new Set([id]))))
  } catch {
    // Bản trên máy không xóa được. Máy chủ vẫn giữ quyết định xóa.
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return normalizeData(structuredClone(SEED))
    return parseStored(raw) ?? normalizeData(structuredClone(SEED))
  } catch {
    return normalizeData(structuredClone(SEED))
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(loadState)
  const [notice, setNotice] = useState<StoreApi['notice']>(null)
  const [mode, setMode] = useState<'checking' | 'local' | 'remote'>('checking')
  const modeRef = useRef(mode)
  const revisionRef = useRef(0)
  const pendingRef = useRef(0)
  const queueRef = useRef(Promise.resolve())
  const importedRef = useRef(false)

  useEffect(() => {
    if (mode !== 'local') return
    const next = JSON.stringify(data)
    try {
      if (localStorage.getItem(STORAGE_KEY) !== next) localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Trình duyệt có thể chặn lưu. Dữ liệu vẫn còn trong phiên này.
    }
  }, [data, mode])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (mode !== 'local') return
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      const next = parseStored(event.newValue)
      if (!next) return
      setData(next)
      setNotice({ id: Date.now(), text: 'Có cập nhật kết quả mới' })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [mode])

  useEffect(() => {
    let ignore = false
    async function probe() {
      const revision = await fetchRevision()
      if (ignore) return
      if (revision == null) {
        modeRef.current = 'local'
        setAuthMode(false, organizerSignedIn())
        setMode('local')
        return
      }
      const state = await fetchState(revision)
      if (ignore || !state) {
        modeRef.current = 'local'
        setAuthMode(false, organizerSignedIn())
        setMode('local')
        return
      }
      const signedIn = await fetchSession()
      if (ignore) return
      setAuthMode(true, signedIn)
      revisionRef.current = state.revision
      modeRef.current = 'remote'
      setData(state.data)
      setMode('remote')
    }
    void probe()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (mode !== 'remote') return
    let stopped = false
    const look = async () => {
      if (stopped || document.visibilityState !== 'visible' || pendingRef.current > 0) return
      const revision = await fetchRevision()
      if (revision == null || revision === revisionRef.current || stopped || pendingRef.current > 0) return
      const state = await fetchState(revision)
      if (!state || stopped || pendingRef.current > 0) return
      revisionRef.current = state.revision
      setData(state.data)
      setNotice({ id: Date.now(), text: 'Có cập nhật kết quả mới' })
    }
    const timer = window.setInterval(() => void look(), 45000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void look()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'remote') return
    let stopped = false
    const run = async () => {
      if (!organizerSignedIn() || importedRef.current) return
      const raw = localStorage.getItem(STORAGE_KEY)
      const local = raw ? parseStored(raw) : null
      if (!local) return
      const pruned = withoutTournaments(local, new Set(deletedIds()))
      importedRef.current = true
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: pruned }),
      })
      if (!response.ok || stopped) return
      const body = (await response.json()) as { changed?: boolean; revision?: number }
      if (!body.changed || typeof body.revision !== 'number') return
      const state = await fetchState(body.revision)
      if (!state || stopped || pendingRef.current > 0) return
      revisionRef.current = state.revision
      setData(state.data)
      setNotice({ id: Date.now(), text: 'Đã đưa giải đang lưu trên máy này lên máy chủ.' })
    }
    void run()
    const stopWatch = watchOrganizerAuth(() => {
      importedRef.current = false
      void run()
    })
    return () => {
      stopped = true
      stopWatch()
    }
  }, [mode])

  function flash(text: string) {
    setNotice({ id: Date.now(), text })
  }

  function commit(
    recipe: (current: StoreData) => StoreData,
    audit: { action: string; entityId?: string; success?: string },
  ) {
    let snapshot: StoreData | null = null
    setData((current) => {
      const next = recipe(current)
      if (next !== current) snapshot = next
      return next
    })
    if (modeRef.current !== 'remote' || !snapshot) return
    const body = snapshot
    pendingRef.current += 1
    queueRef.current = queueRef.current
      .then(() => push(body, audit))
      .finally(() => {
        pendingRef.current -= 1
      })
  }

  async function push(next: StoreData, audit: { action: string; entityId?: string; success?: string }) {
    try {
      const response = await fetch('/api/admin/commit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: revisionRef.current,
          action: audit.action,
          entityId: audit.entityId ?? '',
          data: next,
        }),
      })
      const payload = (await response.json().catch(() => null)) as {
        error?: string
        revision?: number
        data?: StoreData
      } | null
      if (response.status === 409 && payload?.data && typeof payload.revision === 'number') {
        revisionRef.current = payload.revision
        setData(payload.data)
        flash('Có thay đổi mới hơn. Đã tải lại, hãy thử lại.')
        return
      }
      if (!response.ok || !payload?.data || typeof payload.revision !== 'number') {
        flash(payload?.error ?? 'Không lưu được lên máy chủ.')
        const fresh = await fetchState(revisionRef.current)
        if (fresh) {
          revisionRef.current = fresh.revision
          setData(fresh.data)
        }
        return
      }
      revisionRef.current = payload.revision
      setData((current) => (current === next ? payload.data! : current))
      if (audit.success) flash(audit.success)
    } catch {
      flash('Không kết nối được máy chủ.')
    }
  }

  const api: StoreApi = {
    data,
    source: mode === 'remote' ? 'remote' : 'local',
    notice,
    updateMatch(matchId, patch: MatchPatch, message?: string) {
      commit((current) =>
        normalizeData({
          ...current,
          matches: current.matches.map((match) => {
            if (match.id !== matchId) return match
            const forfeit = patch.forfeit === 'A' || patch.forfeit === 'B' ? patch.forfeit : undefined
            return {
              ...match,
              sets: forfeit ? [] : cleanSets(patch.sets),
              forfeit,
              court: patch.court.trim() || match.court,
              scheduledAt: patch.scheduledAt || match.scheduledAt,
            }
          }),
        }),
      { action: 'updateMatch', entityId: matchId })
      flash(message ?? 'Đã lưu tỷ số. Trang khán giả cập nhật ngay.')
    },
    clearScore(matchId) {
      commit((current) =>
        normalizeData({
          ...current,
          matches: current.matches.map((match) =>
            match.id === matchId ? { ...match, sets: [], forfeit: undefined } : match,
          ),
        }),
      { action: 'clearScore', entityId: matchId })
      flash('Đã xóa tỷ số')
    },
    updateTournament(id, patch) {
      commit((current) =>
        normalizeData({
          ...current,
          tournaments: current.tournaments.map((tournament) =>
            tournament.id === id ? { ...tournament, ...patch } : tournament,
          ),
        }),
      { action: 'updateTournament', entityId: id })
      flash('Đã lưu thông tin giải')
    },
    setTournamentStatus(id, status: TournamentStatus) {
      commit((current) => ({
        ...current,
        tournaments: current.tournaments.map((tournament) =>
          tournament.id === id ? { ...tournament, status } : tournament,
        ),
      }), { action: 'setTournamentStatus', entityId: id })
      flash('Đã đổi trạng thái giải')
    },
    updateConfig(id, patch) {
      commit((current) =>
        normalizeData({
          ...current,
          tournaments: current.tournaments.map((tournament) =>
            tournament.id === id ? { ...tournament, config: { ...tournament.config, ...patch } } : tournament,
          ),
        }),
      { action: 'updateConfig', entityId: id })
    },
    addTournament(input: NewTournamentInput) {
      const id = `t-${crypto.randomUUID().slice(0, 8)}`
      commit((current) => ({
        ...current,
        tournaments: [
          ...current.tournaments,
          {
            id,
            name: input.name.trim(),
            venue: input.venue.trim(),
            city: input.city.trim(),
            startDate: input.startDate,
            endDate: input.endDate,
            status: 'upcoming',
            category: input.category.trim() || 'Đôi',
            description: input.description.trim() || 'Dành cho thành viên nội bộ. Ban tổ chức nhập tên từng người.',
            pairingMode: 'random-fixed' as PairingMode,
            config: { ...defaultConfig(), pointsPerSet: input.pointsPerSet, winByTwo: input.winByTwo },
          },
        ],
        players: [
          ...current.players,
          ...input.playerNames
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => ({ id: crypto.randomUUID(), tournamentId: id, name })),
        ],
      }), { action: 'addTournament', entityId: id })
      flash('Đã thêm giải mới')
      return id
    },
    addPlayer(tournamentId, name) {
      const trimmed = name.trim()
      if (!trimmed) return false
      if (data.teams.some((team) => team.tournamentId === tournamentId)) return false
      commit((current) => {
        if (current.teams.some((team) => team.tournamentId === tournamentId)) return current
        return {
          ...current,
          players: [...current.players, { id: crypto.randomUUID(), tournamentId, name: trimmed }],
        }
      }, { action: 'addPlayer', entityId: tournamentId })
      flash('Đã thêm người tham dự')
      return true
    },
    removePlayer(playerId) {
      const player = data.players.find((item) => item.id === playerId)
      if (!player) return false
      const paired = data.teams.some(
        (team) => team.tournamentId === player.tournamentId && team.playerIds.includes(playerId),
      )
      if (paired) return false
      commit((current) => ({
        ...current,
        players: current.players.filter((item) => item.id !== playerId),
      }), { action: 'removePlayer', entityId: playerId })
      return true
    },
    startTournament(tournamentId) {
      const tournament = data.tournaments.find((item) => item.id === tournamentId)
      if (!tournament) return 'Không tìm thấy giải.'
      const players = data.players.filter((item) => item.tournamentId === tournamentId)
      const started = data.teams.some((team) => team.tournamentId === tournamentId)
      const reason = startBlockReason(players.length, started)
      if (reason) return reason
      const summary = championPlan(players.length / 2)
      commit((current) => {
        const freshTournament = current.tournaments.find((item) => item.id === tournamentId)
        if (!freshTournament) return current
        const freshPlayers = current.players.filter((item) => item.tournamentId === tournamentId)
        const freshStarted = current.teams.some((team) => team.tournamentId === tournamentId)
        if (startBlockReason(freshPlayers.length, freshStarted)) return current
        const next = buildDraw({
          tournamentId,
          players: freshPlayers,
          startDate: freshTournament.startDate,
          endDate: freshTournament.endDate,
        })
        const description = [freshTournament.description.trim(), next.summary].filter(Boolean).join(' ')
        return normalizeData({
          ...current,
            tournaments: current.tournaments.map((item) =>
              item.id === tournamentId ? { ...item, status: 'live', description, managedDraw: true } : item,
            ),
          teams: [...current.teams.filter((team) => team.tournamentId !== tournamentId), ...next.teams],
          groups: [...current.groups.filter((group) => group.tournamentId !== tournamentId), ...next.groups],
          matches: [...current.matches.filter((match) => match.tournamentId !== tournamentId), ...next.matches],
        })
      }, { action: 'startTournament', entityId: tournamentId })
      flash(`Đã ghép ngẫu nhiên ${players.length / 2} đội. ${summary}`)
      return null
    },
    redrawTournament(tournamentId) {
      const tournament = data.tournaments.find((item) => item.id === tournamentId)
      if (!tournament) return 'Không tìm thấy giải.'
      if (!tournament.managedDraw) return 'Giải này không xếp lại cặp.'
      const started = data.teams.some((team) => team.tournamentId === tournamentId)
      if (!started) return 'Giải chưa bắt đầu.'
      const played = data.matches.some(
        (match) =>
          match.tournamentId === tournamentId &&
          (match.status !== 'scheduled' || match.sets.length > 0 || match.forfeit),
      )
      if (played) return 'Đã có tỷ số, không xếp lại cặp.'
      const players = data.players.filter((item) => item.tournamentId === tournamentId)
      const built = buildDraw({
        tournamentId,
        players,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
      })
      commit((current) => {
        const fresh = current.tournaments.find((item) => item.id === tournamentId)
        if (!fresh?.managedDraw) return current
        const freshPlayed = current.matches.some(
          (match) =>
            match.tournamentId === tournamentId &&
            (match.status !== 'scheduled' || match.sets.length > 0 || match.forfeit),
        )
        if (freshPlayed) return current
        const freshPlayers = current.players.filter((item) => item.tournamentId === tournamentId)
        const next = buildDraw({
          tournamentId,
          players: freshPlayers,
          startDate: fresh.startDate,
          endDate: fresh.endDate,
        })
        return normalizeData({
          ...current,
          tournaments: current.tournaments.map((item) =>
            item.id === tournamentId ? { ...item, status: 'live', managedDraw: true } : item,
          ),
          teams: [...current.teams.filter((team) => team.tournamentId !== tournamentId), ...next.teams],
          groups: [...current.groups.filter((group) => group.tournamentId !== tournamentId), ...next.groups],
          matches: [...current.matches.filter((match) => match.tournamentId !== tournamentId), ...next.matches],
        })
      }, { action: 'redrawTournament', entityId: tournamentId })
      flash(`Đã xếp cặp lại ngẫu nhiên. ${built.summary}`)
      return null
    },
    addGroup(tournamentId, name) {
      const trimmed = name.trim()
      if (!trimmed) return false
      const exists = data.groups.some(
        (item) => item.tournamentId === tournamentId && item.name.toLowerCase() === trimmed.toLowerCase(),
      )
      if (exists) return false
      const id = crypto.randomUUID()
      commit((current) => {
        const stillExists = current.groups.some(
          (item) => item.tournamentId === tournamentId && item.name.toLowerCase() === trimmed.toLowerCase(),
        )
        if (stillExists) return current
        return {
          ...current,
          groups: [...current.groups, { id, tournamentId, name: trimmed, teamIds: [] }],
        }
      }, { action: 'addGroup', entityId: id })
      flash('Đã thêm bảng đấu')
      return true
    },
    addPair(input: NewPairInput) {
      const nameA = input.playerA.trim()
      const nameB = input.playerB.trim()
      if (!nameA || !nameB) return
      const playerA = crypto.randomUUID()
      const playerB = crypto.randomUUID()
      const teamId = crypto.randomUUID()
      commit((current) => {
        let groups = current.groups
        let groupId = input.groupId
        if (!groupId) {
          const existing = groups.find((item) => item.tournamentId === input.tournamentId)
          if (existing) groupId = existing.id
          else {
            groupId = crypto.randomUUID()
            groups = [...groups, { id: groupId, tournamentId: input.tournamentId, name: 'Bảng A', teamIds: [] }]
          }
        }
        return {
          ...current,
          players: [
            ...current.players,
            { id: playerA, tournamentId: input.tournamentId, name: nameA },
            { id: playerB, tournamentId: input.tournamentId, name: nameB },
          ],
          teams: [
            ...current.teams,
            {
              id: teamId,
              tournamentId: input.tournamentId,
              name: pairTitle([nameA, nameB]),
              playerIds: [playerA, playerB],
            },
          ],
          groups: groups.map((item) =>
            item.id === groupId ? { ...item, teamIds: [...item.teamIds, teamId] } : item,
          ),
        }
      }, { action: 'addPair', entityId: teamId })
      flash('Đã thêm đôi thành viên')
    },
    savePlayersAndRedraw(tournamentId, names) {
      const cleaned = names.map((name) => name.trim()).filter(Boolean)
      const reason = startBlockReason(cleaned.length, false)
      if (reason) return reason
      if (!data.tournaments.some((item) => item.id === tournamentId)) return 'Không tìm thấy giải.'
      commit((current) => {
        const fresh = current.tournaments.find((item) => item.id === tournamentId)
        if (!fresh) return current
        const freshPlayers = cleaned.map((name) => ({ id: crypto.randomUUID(), tournamentId, name }))
        const drawn = buildDraw({
          tournamentId,
          players: freshPlayers,
          startDate: fresh.startDate,
          endDate: fresh.endDate,
        })
        return normalizeData({
          ...current,
          tournaments: current.tournaments.map((item) =>
            item.id === tournamentId ? { ...item, status: 'live', managedDraw: true } : item,
          ),
          players: [...current.players.filter((player) => player.tournamentId !== tournamentId), ...freshPlayers],
          teams: [...current.teams.filter((team) => team.tournamentId !== tournamentId), ...drawn.teams],
          groups: [...current.groups.filter((group) => group.tournamentId !== tournamentId), ...drawn.groups],
          matches: [...current.matches.filter((match) => match.tournamentId !== tournamentId), ...drawn.matches],
        })
      }, { action: 'savePlayersAndRedraw', entityId: tournamentId })
      flash(`Đã tạo lại ${cleaned.length / 2} đội và lịch thi đấu.`)
      return null
    },
    saveMembers(tournamentId, input: MemberInput) {
      const names = input.names.map((name) => name.trim()).filter(Boolean)
      if (names.length > 32) return 'Nhiều nhất 32 người.'
      if (new Set(names.map((name) => name.toLocaleLowerCase('vi'))).size !== names.length) {
        return 'Mỗi người một tên khác nhau.'
      }
      if (input.pairingMode === 'fixed') {
        const seen = new Set<number>()
        for (const [left, right] of input.pairs) {
          if (
            left === right ||
            left < 0 ||
            right < 0 ||
            left >= names.length ||
            right >= names.length ||
            seen.has(left) ||
            seen.has(right)
          ) {
            return 'Mỗi người chỉ ở một cặp.'
          }
          seen.add(left)
          seen.add(right)
        }
      }
      if (!data.tournaments.some((item) => item.id === tournamentId)) return 'Không tìm thấy giải.'
      const players = names.map((name) => ({ id: crypto.randomUUID(), tournamentId, name }))
      const teams =
        input.pairingMode === 'fixed'
          ? input.pairs.map(([left, right]) => ({
              id: crypto.randomUUID(),
              tournamentId,
              name: `${players[left].name} / ${players[right].name}`,
              playerIds: [players[left].id, players[right].id],
            }))
          : []
      commit(
        (current) => {
          if (!current.tournaments.some((item) => item.id === tournamentId)) return current
          const hadMatches = current.matches.some((match) => match.tournamentId === tournamentId)
          return {
            ...current,
            tournaments: current.tournaments.map((item) =>
              item.id === tournamentId
                ? {
                    ...item,
                    pairingMode: input.pairingMode,
                    managedDraw: true,
                    status: hadMatches ? 'upcoming' : item.status,
                  }
                : item,
            ),
            players: [...current.players.filter((player) => player.tournamentId !== tournamentId), ...players],
            teams: [...current.teams.filter((team) => team.tournamentId !== tournamentId), ...teams],
            groups: current.groups.filter((group) => group.tournamentId !== tournamentId),
            matches: current.matches.filter((match) => match.tournamentId !== tournamentId),
          }
        },
        { action: 'saveMembers', entityId: tournamentId },
      )
      flash('Đã lưu thành viên.')
      return null
    },
    createSchedule(tournamentId) {
      const tournament = data.tournaments.find((item) => item.id === tournamentId)
      if (!tournament) return 'Không tìm thấy giải.'
      const players = data.players.filter((item) => item.tournamentId === tournamentId)
      const reason = rosterBlockReason(players.length)
      if (reason) return reason
      const storedTeams = data.teams.filter((team) => team.tournamentId === tournamentId && team.playerIds.length === 2)
      if (tournament.pairingMode === 'fixed') {
        const covered = storedTeams.flatMap((team) => team.playerIds)
        if (new Set(covered).size !== players.length || covered.length !== players.length) {
          return 'Hãy ghép hết các cặp cố định ở tab Thành viên.'
        }
      }
      const draw =
        tournament.pairingMode === 'fixed'
          ? buildPairSchedule({ tournamentId, teams: storedTeams, startDate: tournament.startDate })
          : tournament.pairingMode === 'random-match'
            ? buildRotatingSchedule({ tournamentId, players, startDate: tournament.startDate })
            : buildRandomFixedSchedule({ tournamentId, players, startDate: tournament.startDate })
      commit(
        (current) => {
          if (!current.tournaments.some((item) => item.id === tournamentId)) return current
          return normalizeData({
            ...current,
            tournaments: current.tournaments.map((item) =>
              item.id === tournamentId ? { ...item, status: 'live', managedDraw: true } : item,
            ),
            teams: [...current.teams.filter((team) => team.tournamentId !== tournamentId), ...draw.teams],
            groups: [...current.groups.filter((group) => group.tournamentId !== tournamentId), ...draw.groups],
            matches: [...current.matches.filter((match) => match.tournamentId !== tournamentId), ...draw.matches],
          })
        },
        { action: 'createSchedule', entityId: tournamentId },
      )
      flash(draw.summary)
      return null
    },
    updatePlayer(playerId, name) {
      const trimmed = name.trim()
      if (!trimmed) return
      commit((current) => {
        const players = current.players.map((item) => (item.id === playerId ? { ...item, name: trimmed } : item))
        const teams = current.teams.map((team) => {
          if (!team.playerIds.includes(playerId)) return team
          const names = team.playerIds.map((id) => players.find((player) => player.id === id)?.name ?? '')
          return { ...team, name: pairTitle(names) }
        })
        return { ...current, players, teams }
      }, { action: 'updatePlayer', entityId: playerId })
    },
    addMatch(input: NewMatchInput) {
      if (input.teamAId === input.teamBId) return false
      if (teamsAlreadyMeet(input.tournamentId, input.teamAId, input.teamBId, data)) {
        flash('Hai đội này đã gặp nhau. Mỗi đội chỉ gặp nhau một set.')
        return false
      }
      commit((current) => {
        if (teamsAlreadyMeet(input.tournamentId, input.teamAId, input.teamBId, current)) return current
        return {
          ...current,
          matches: [
            ...current.matches,
            {
              id: crypto.randomUUID(),
              tournamentId: input.tournamentId,
              stage: input.stage,
              roundLabel: input.roundLabel,
              groupId: input.stage === 'group' ? input.groupId : undefined,
              court: input.court.trim(),
              scheduledAt: input.scheduledAt,
              slotA: { kind: 'team', teamId: input.teamAId },
              slotB: { kind: 'team', teamId: input.teamBId },
              sets: [],
              status: statusFromSets([], 2),
            },
          ],
        }
      }, { action: 'addMatch', entityId: input.tournamentId })
      flash('Đã thêm trận vào lịch')
      return true
    },
    deleteTournament(id) {
      const tournament = data.tournaments.find((item) => item.id === id)
      if (!tournament) return
      dropStoredTournament(id)
      const message = `Đã xóa ${tournament.name}`
      commit((current) => withoutTournaments(current, new Set([id])), {
        action: 'deleteTournament',
        entityId: id,
        success: message,
      })
      if (modeRef.current !== 'remote') flash(message)
    },
    resetDemo() {
      if (modeRef.current === 'remote') {
        flash('Không khôi phục dữ liệu mẫu trên máy chủ.')
        return
      }
      const fresh = structuredClone(SEED)
      commit(() => fresh, { action: 'resetDemo' })
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
      } catch {
        // Bỏ qua nếu trình duyệt không cho lưu.
      }
      flash('Đã khôi phục dữ liệu mẫu')
    },
  }

  if (mode === 'checking') return <div className="min-h-dvh bg-sand" />

  return (
    <TournamentContext.Provider value={api}>
      {children}
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-[92%] rounded-full bg-court px-4 py-2 text-center text-sm font-semibold text-white shadow-lg md:bottom-6"
        >
          {notice.text}
        </div>
      ) : null}
    </TournamentContext.Provider>
  )
}
