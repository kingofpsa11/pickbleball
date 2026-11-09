import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MatchCard } from '../components/MatchCard.tsx'
import { Standings } from '../components/Standings.tsx'
import { SectionTabs, SiteHeader, fieldClass } from '../components/ui.tsx'
import type { TabItem } from '../components/ui.tsx'
import { organizerSignedIn } from '../lib/auth.ts'
import { canEnterScore, firstUnfinishedMatch, formatSummary, viewMatch } from '../lib/results.ts'
import { pairingChoices, pairingLabel } from '../lib/schedule.ts'
import { useTournamentStore } from '../store/context.ts'
import type { PairingMode, Tournament } from '../types.ts'

const categories = ['Đôi nam', 'Đôi nữ', 'Đôi hỗn hợp']

const manageTabs = [
  { id: 'thong-tin', label: 'Thông tin giải', short: 'Thông tin' },
  { id: 'thanh-vien', label: 'Thành viên', short: 'Thành viên' },
  { id: 'tran', label: 'Các trận đấu', short: 'Trận đấu' },
  { id: 'bxh', label: 'Bảng xếp hạng', short: 'Xếp hạng' },
]

export function AdminPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useTournamentStore()
  const [search, setSearch] = useSearchParams()

  useEffect(() => {
    document.title = 'Ban tổ chức · Pickleball Thuỷ Lợi'
  }, [])

  const task = search.get('viec') === 'them' ? 'them' : 'lich-su'
  const requestedId = search.get('giai')
  const tournament = store.data.tournaments.find((item) => item.id === requestedId)

  if (!organizerSignedIn()) {
    const next = `/ban-to-chuc${location.search}`
    return <Navigate to={`/ban-to-chuc/dang-nhap?next=${encodeURIComponent(next)}`} replace />
  }

  if (task === 'lich-su' && !tournament) {
    return <Navigate to="/lich-su" replace />
  }

  function openView(nextTask: 'them' | 'lich-su', id = tournament?.id) {
    const next = new URLSearchParams()
    next.set('viec', nextTask)
    if (nextTask === 'lich-su' && id) next.set('giai', id)
    setSearch(next, { replace: true })
  }

  return (
    <div className="min-h-dvh bg-sand">
      <SiteHeader organizer onLogout={() => navigate('/')} />
      <main className="mx-auto max-w-5xl px-4 py-5 pb-10">
        <h1 className="text-2xl font-extrabold">Quản lý giải</h1>

        {task === 'them' ? (
          <NewTournamentForm
            open
            onCreated={(id) => {
              openView('lich-su', id)
            }}
          />
        ) : null}

        {task === 'lich-su' && tournament ? (
          <TournamentDesk tournament={tournament} muc={search.get('muc')} />
        ) : null}

        {store.source === 'remote' ? <AuditList /> : null}

        {store.source === 'local' ? (
          <button
            type="button"
            className="mt-8 text-sm font-semibold text-live"
            onClick={() => {
              if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu? Các giải và tỷ số hiện tại sẽ bị thay bằng dữ liệu mẫu.')) {
                store.resetDemo()
              }
            }}
          >
            Khôi phục dữ liệu mẫu
          </button>
        ) : null}
      </main>
    </div>
  )
}

function TournamentDesk({ tournament, muc }: { tournament: Tournament; muc: string | null }) {
  const { data } = useTournamentStore()
  const section = manageTabs.some((item) => item.id === muc) ? muc : 'thong-tin'
  const tabs: TabItem[] = manageTabs.map((item) => ({
    ...item,
    to: `/ban-to-chuc?viec=lich-su&giai=${tournament.id}&muc=${item.id}`,
  }))

  return (
    <>
      <Link to="/lich-su" className="mt-4 inline-block text-sm font-semibold text-court">
        ← Lịch sử các giải
      </Link>
      <h2 className="mt-2 text-xl font-extrabold">{tournament.name}</h2>
      <p className="mt-1 text-sm text-muted">
        {formatSummary(tournament.config)} · {pairingLabel(tournament.pairingMode)}
      </p>
      <div className="mt-4">
        <SectionTabs items={tabs} current={section ?? 'thong-tin'} label="Mục quản lý giải" />
      </div>
      {section === 'thong-tin' ? <TournamentInfoForm key={tournament.id} tournament={tournament} /> : null}
      {section === 'thanh-vien' ? <MembersForm key={tournament.id} tournament={tournament} /> : null}
      {section === 'tran' ? (
        <MatchDesk key={tournament.id} tournament={tournament} onlyLive={false} />
      ) : null}
      {section === 'bxh' ? (
        <>
          <SchedulePanel tournamentId={tournament.id} />
          <Standings tournamentId={tournament.id} data={data} />
        </>
      ) : null}
    </>
  )
}

function TournamentInfoForm({ tournament }: { tournament: Tournament }) {
  const { updateTournament } = useTournamentStore()
  const [name, setName] = useState(tournament.name)
  const [category, setCategory] = useState(tournament.category)
  const [startDate, setStartDate] = useState(tournament.startDate)
  const [pointsPerSet, setPointsPerSet] = useState<11 | 15>(tournament.config.pointsPerSet === 15 ? 15 : 11)
  const [winByTwo, setWinByTwo] = useState(tournament.config.winByTwo !== false)
  const choices = categories.includes(category) ? categories : [category, ...categories]

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateTournament(tournament.id, {
      name: name.trim(),
      category,
      startDate,
      endDate: startDate,
      config: { ...tournament.config, pointsPerSet, winByTwo },
    })
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-card p-4 ring-1 ring-line">
      <h2 className="font-extrabold">Thông tin giải</h2>
      <div className="mt-3 grid gap-3">
        <label className="text-sm font-semibold">
          Tên giải
          <input className={`${fieldClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="text-sm font-semibold">
          Nội dung
          <select className={`${fieldClass} mt-1`} value={category} onChange={(event) => setCategory(event.target.value)}>
            {choices.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Ngày
          <input
            type="date"
            className={`${fieldClass} mt-1`}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Điểm để thắng</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([11, 15] as const).map((points) => (
              <label
                key={points}
                className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ${pointsPerSet === points ? 'bg-court text-white ring-court' : 'bg-white ring-line'}`}
              >
                <input
                  type="radio"
                  name="diem-thang-giai"
                  className="accent-ball"
                  checked={pointsPerSet === points}
                  onChange={() => setPointsPerSet(points)}
                />
                {points} điểm
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">Cách thắng set</legend>
          <div className="mt-2 grid gap-2">
            <label className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ${winByTwo ? 'bg-white ring-line' : 'bg-court text-white ring-court'}`}>
              <input type="radio" name="cach-thang-giai" className="accent-ball" checked={!winByTwo} onChange={() => setWinByTwo(false)} />
              Chạm đến điểm tối đa
            </label>
            <label className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ${winByTwo ? 'bg-court text-white ring-court' : 'bg-white ring-line'}`}>
              <input type="radio" name="cach-thang-giai" className="accent-ball" checked={winByTwo} onChange={() => setWinByTwo(true)} />
              Phải cách 2 điểm
            </label>
          </div>
        </fieldset>
      </div>
      <button type="submit" className="mt-4 w-full rounded-2xl bg-court py-3 font-bold text-white">
        Lưu thông tin
      </button>
    </form>
  )
}

function NewTournamentForm({ onCreated, open = false }: { onCreated: (id: string) => void; open?: boolean }) {
  const { addTournament } = useTournamentStore()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Đôi nam')
  const [startDate, setStartDate] = useState('2026-12-01')
  const [pointsPerSet, setPointsPerSet] = useState<11 | 15>(11)
  const [winByTwo, setWinByTwo] = useState(true)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = addTournament({
      name,
      venue: '',
      city: '',
      category,
      startDate,
      endDate: startDate,
      description: '',
      playerNames: [],
      pointsPerSet,
      winByTwo,
    })
    setName('')
    setPointsPerSet(11)
    setWinByTwo(true)
    onCreated(id)
  }

  const form = (
      <form onSubmit={submit} className="mt-3 grid gap-3">
        <label className="text-sm font-semibold">
          Tên giải
          <input className={`${fieldClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="text-sm font-semibold">
          Nội dung
          <select className={`${fieldClass} mt-1`} value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Ngày
          <input type="date" className={`${fieldClass} mt-1`} value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Điểm để thắng</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([11, 15] as const).map((points) => (
              <label
                key={points}
                className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ${pointsPerSet === points ? 'bg-court text-white ring-court' : 'bg-white ring-line'}`}
              >
                <input
                  type="radio"
                  name="diem-thang"
                  className="accent-ball"
                  checked={pointsPerSet === points}
                  onChange={() => setPointsPerSet(points)}
                />
                {points} điểm
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">Cách thắng set</legend>
          <div className="mt-2 grid gap-2">
            <label className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ${winByTwo ? 'bg-white ring-line' : 'bg-court text-white ring-court'}`}>
              <input type="radio" name="cach-thang" className="accent-ball" checked={!winByTwo} onChange={() => setWinByTwo(false)} />
              Chạm đến điểm tối đa
            </label>
            <label className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ${winByTwo ? 'bg-court text-white ring-court' : 'bg-white ring-line'}`}>
              <input type="radio" name="cach-thang" className="accent-ball" checked={winByTwo} onChange={() => setWinByTwo(true)} />
              Phải cách 2 điểm
            </label>
          </div>
        </fieldset>
        <button type="submit" className="rounded-2xl bg-court py-3 font-bold text-white">
          Tạo giải
        </button>
      </form>
  )

  if (open) {
    return <div className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-line">{form}</div>
  }

  return (
    <details className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-line">
      <summary className="cursor-pointer font-semibold">Thêm giải mới</summary>
      {form}
    </details>
  )
}

function MatchDesk({ tournament, onlyLive }: { tournament: Tournament; onlyLive: boolean }) {
  const { data, updateMatch } = useTournamentStore()
  const matches = data.matches
    .filter((match) => match.tournamentId === tournament.id && (!onlyLive || match.status === 'live'))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const currentId = firstUnfinishedMatch(matches)?.id ?? null
  return (
    <div className="space-y-3">
      {matches.length === 0 ? (
        <p className="text-sm text-muted">
          {onlyLive ? 'Không có trận đang đấu.' : 'Chưa có trận. Hãy bấm Tạo lịch thi đấu ở tab xếp hạng.'}
        </p>
      ) : null}
      {matches.map((match) => {
        const view = viewMatch(match, data)
        const ready = canEnterScore(match, data)
        return (
          <div key={match.id} className="space-y-2">
            <MatchCard
              key={`${match.id}:${match.sets[0]?.a ?? 0}-${match.sets[0]?.b ?? 0}:${match.forfeit ?? ''}`}
              view={view}
              teams={data.teams}
              players={data.players}
              groupName={data.groups.find((group) => group.id === match.groupId)?.name}
              playing={match.id === currentId}
              onScore={
                ready
                  ? (score) =>
                      updateMatch(match.id, {
                        sets: [score],
                        court: match.court,
                        scheduledAt: match.scheduledAt,
                        forfeit: null,
                      })
                  : undefined
              }
            />
            {ready ? null : (
              <p className="text-sm text-muted">Chưa chốt đủ hai đôi, nên chưa nhập tỷ số cho trận này.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MembersForm({ tournament }: { tournament: Tournament }) {
  const store = useTournamentStore()
  const savedPlayers = store.data.players.filter((player) => player.tournamentId === tournament.id)
  const savedTeams = store.data.teams.filter((team) => team.tournamentId === tournament.id)
  const [people, setPeople] = useState(() => savedPlayers.map((player) => ({ key: player.id, name: player.name })))
  const [mode, setMode] = useState<PairingMode>(tournament.pairingMode)
  const [pairs, setPairs] = useState<[string, string][]>(() =>
    savedTeams
      .map((team) => team.playerIds)
      .filter((ids): ids is [string, string] => ids.length === 2),
  )
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [error, setError] = useState('')
  const paired = new Set(pairs.flat())
  const open = people.filter((person) => person.name.trim() && !paired.has(person.key))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const kept = people.filter((person) => person.name.trim())
    const indexOf = new Map(kept.map((person, index) => [person.key, index]))
    const nextPairs = pairs
      .map(([a, b]) => [indexOf.get(a), indexOf.get(b)] as const)
      .filter((pair): pair is [number, number] => pair[0] !== undefined && pair[1] !== undefined)
    const matches = store.data.matches.some((match) => match.tournamentId === tournament.id)
    if (matches && !window.confirm('Lưu thành viên sẽ xóa lịch và tỷ số hiện có.')) return
    const message = store.saveMembers(tournament.id, {
      names: kept.map((person) => person.name),
      pairingMode: mode,
      pairs: mode === 'fixed' ? nextPairs : [],
    })
    setError(message ?? '')
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-card p-4 ring-1 ring-line">
      <h2 className="font-extrabold">Thành viên</h2>
      <p className="mt-1 text-sm text-muted">Thêm tên trước. Lịch thi đấu tạo ở tab xếp hạng.</p>
      <div className="mt-3 space-y-2">
        {people.map((person) => (
          <div key={person.key} className="flex items-center gap-2">
            <input
              aria-label="Tên thành viên"
              className={fieldClass}
              value={person.name}
              onChange={(event) =>
                setPeople((current) =>
                  current.map((item) => (item.key === person.key ? { ...item, name: event.target.value } : item)),
                )
              }
              required
            />
            <button
              type="button"
              className="shrink-0 text-sm font-semibold text-live"
              onClick={() => {
                setPeople((current) => current.filter((item) => item.key !== person.key))
                setPairs((current) => current.filter((pair) => !pair.includes(person.key)))
              }}
            >
              Bỏ
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 text-sm font-bold text-court"
        onClick={() => setPeople((current) => [...current, { key: crypto.randomUUID(), name: '' }])}
      >
        Thêm tên
      </button>
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">Thể thức ghép đôi</legend>
        <div className="mt-2 grid gap-2">
          {pairingChoices.map((choice) => (
            <label
              key={choice.id}
              className={`rounded-2xl px-3 py-3 text-sm ring-1 ${mode === choice.id ? 'bg-court text-white ring-court' : 'bg-white ring-line'}`}
            >
              <span className="flex items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name="ghep-doi"
                  className="accent-ball"
                  checked={mode === choice.id}
                  onChange={() => setMode(choice.id)}
                />
                {choice.label}
              </span>
              <span className={`mt-1 block ${mode === choice.id ? 'text-white/80' : 'text-muted'}`}>{choice.detail}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {mode === 'fixed' ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Ghép cặp cố định</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select
              aria-label="Người thứ nhất"
              className={fieldClass}
              value={left}
              onChange={(event) => {
                const value = event.target.value
                setLeft(value)
                if (value && value === right) setRight('')
              }}
            >
              <option value="">Chọn người</option>
              {open
                .filter((person) => person.key !== right)
                .map((person) => (
                  <option key={person.key} value={person.key}>
                    {person.name.trim()}
                  </option>
                ))}
            </select>
            <select
              aria-label="Người thứ hai"
              className={fieldClass}
              value={right}
              onChange={(event) => {
                const value = event.target.value
                setRight(value)
                if (value && value === left) setLeft('')
              }}
            >
              <option value="">Chọn người</option>
              {open
                .filter((person) => person.key !== left)
                .map((person) => (
                  <option key={person.key} value={person.key}>
                    {person.name.trim()}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="rounded-2xl bg-court px-4 py-3 text-sm font-bold text-white"
              onClick={() => {
                if (!left || !right || left === right) return
                setPairs((current) => [...current, [left, right]])
                setLeft('')
                setRight('')
              }}
            >
              Ghép cặp
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {pairs.map((pair) => (
              <li key={pair.join(':')} className="flex items-center justify-between gap-3 rounded-2xl bg-sand px-3 py-2 text-sm font-semibold">
                <span>
                  {people.find((person) => person.key === pair[0])?.name.trim() || 'Người'} /{' '}
                  {people.find((person) => person.key === pair[1])?.name.trim() || 'Người'}
                </span>
                <button
                  type="button"
                  className="text-sm font-semibold text-live"
                  onClick={() => setPairs((current) => current.filter((item) => item.join(':') !== pair.join(':')))}
                >
                  Tách
                </button>
              </li>
            ))}
          </ul>
          {open.length > 0 ? <p className="mt-2 text-sm text-muted">Còn {open.length} người chưa có cặp.</p> : null}
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-live">{error}</p> : null}
      <button type="submit" className="mt-4 w-full rounded-2xl bg-court py-3 font-bold text-white">
        Lưu thành viên
      </button>
    </form>
  )
}

function SchedulePanel({ tournamentId }: { tournamentId: string }) {
  const store = useTournamentStore()
  const [error, setError] = useState('')

  function create() {
    const matches = store.data.matches.filter((match) => match.tournamentId === tournamentId)
    const scored = matches.some((match) => match.sets.length > 0 || match.forfeit)
    if (scored && !window.confirm('Tạo lịch sẽ xếp lại các trận và xóa tỷ số hiện có.')) return
    if (!scored && matches.length > 0 && !window.confirm('Tạo lịch sẽ thay lịch hiện tại.')) return
    const message = store.createSchedule(tournamentId)
    setError(message ?? '')
  }

  return (
    <div className="mb-4 rounded-3xl bg-card p-4 ring-1 ring-line">
      <h2 className="font-extrabold">Lịch thi đấu</h2>
      <p className="mt-1 text-sm text-muted">
        Xếp trận để mỗi đôi hoặc mỗi người không phải đánh quá nhiều trận liền. Số trận và lần nghỉ được chia đều.
      </p>
      {error ? <p className="mt-3 text-sm font-semibold text-live">{error}</p> : null}
      <button type="button" className="mt-4 w-full rounded-2xl bg-court py-3 font-bold text-white" onClick={create}>
        Tạo lịch thi đấu
      </button>
    </div>
  )
}

function AuditList() {
  const [rows, setRows] = useState<{ id: number; actor: string; summary: string; createdAt: string }[]>([])

  useEffect(() => {
    void fetch('/api/admin/audit', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body: { rows?: { id: number; actor: string; summary: string; createdAt: string }[] } | null) => {
        if (body?.rows) setRows(body.rows)
      })
      .catch(() => undefined)
  }, [])

  if (rows.length === 0) return null
  return (
    <details className="mt-6 rounded-3xl bg-card p-4 ring-1 ring-line">
      <summary className="cursor-pointer text-sm font-extrabold">Lịch sử sửa đổi</summary>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {rows.map((row) => (
          <li key={row.id}>
            {row.createdAt} · {row.actor} · {row.summary}
          </li>
        ))}
      </ul>
    </details>
  )
}

