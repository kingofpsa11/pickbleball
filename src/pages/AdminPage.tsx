import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MatchCard } from '../components/MatchCard.tsx'
import { Standings } from '../components/Standings.tsx'
import { SectionTabs, SiteHeader, fieldClass } from '../components/ui.tsx'
import type { TabItem } from '../components/ui.tsx'
import { championPlan, parseParticipantNames, startBlockReason } from '../lib/draw.ts'
import { organizerSignedIn } from '../lib/auth.ts'
import { canEnterScore, firstUnfinishedMatch, viewMatch } from '../lib/results.ts'
import { useTournamentStore } from '../store/context.ts'
import type { Tournament } from '../types.ts'

const categories = ['Đôi nam', 'Đôi nữ', 'Đôi hỗn hợp']

const manageTabs = [
  { id: 'thong-tin', label: 'Thông tin giải và thành viên', short: 'Thông tin' },
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

        <button
          type="button"
          className="mt-8 text-sm font-semibold text-live"
          onClick={() => {
            if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu? Các tỷ số vừa nhập trên máy này sẽ mất.')) {
              store.resetDemo()
            }
          }}
        >
          Khôi phục dữ liệu mẫu
        </button>
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
      <div className="mt-4">
        <SectionTabs items={tabs} current={section ?? 'thong-tin'} label="Mục quản lý giải" />
      </div>
      {section === 'thong-tin' ? (
        <>
          <TournamentInfoForm key={tournament.id} tournament={tournament} />
          <PlayerNamesForm key={`${tournament.id}-players`} tournamentId={tournament.id} />
        </>
      ) : null}
      {section === 'tran' ? (
        <MatchDesk key={tournament.id} tournament={tournament} onlyLive={false} />
      ) : null}
      {section === 'bxh' ? <Standings tournamentId={tournament.id} data={data} /> : null}
    </>
  )
}

function TournamentInfoForm({ tournament }: { tournament: Tournament }) {
  const { updateTournament } = useTournamentStore()
  const [name, setName] = useState(tournament.name)
  const [category, setCategory] = useState(tournament.category)
  const [startDate, setStartDate] = useState(tournament.startDate)
  const choices = categories.includes(category) ? categories : [category, ...categories]

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateTournament(tournament.id, {
      name: name.trim(),
      category,
      startDate,
      endDate: startDate,
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
  const [namesText, setNamesText] = useState('')
  const [error, setError] = useState('')
  const names = parseParticipantNames(namesText)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (names.length === 0) {
      setError('Nhập tên người tham dự, mỗi dòng một tên.')
      return
    }
    const id = addTournament({
      name,
      venue: '',
      city: '',
      category,
      startDate,
      endDate: startDate,
      description: '',
      playerNames: names,
    })
    setName('')
    setNamesText('')
    setError('')
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
        <label className="text-sm font-semibold">
          Người tham dự
          <textarea
            className={`${fieldClass} mt-1`}
            rows={6}
            placeholder={'Mỗi dòng một tên\nVí dụ:\nAn\nBình\nChi\nDũng'}
            value={namesText}
            onChange={(event) => setNamesText(event.target.value)}
            required
          />
        </label>
        <p className="text-sm text-muted">
          {names.length} người
          {names.length >= 2 && names.length % 2 === 0 ? ` · ${names.length / 2} đội. ${championPlan(names.length / 2)}` : ''}
          {names.length > 0 && names.length % 2 === 1 ? ' · cần thêm hoặc bớt 1 người để ghép đôi.' : ''}
        </p>
        {error ? <p className="text-sm font-semibold text-live">{error}</p> : null}
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
          {onlyLive ? 'Không có trận đang đấu.' : 'Chưa có trận. Hãy bấm Tạo giải ở tab thông tin để xếp lịch.'}
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

function PlayerNamesForm({ tournamentId }: { tournamentId: string }) {
  const store = useTournamentStore()
  const players = store.data.players.filter((player) => player.tournamentId === tournamentId)
  const [names, setNames] = useState(players.map((player) => player.name))
  const [error, setError] = useState('')
  const played = store.data.matches.some(
    (match) => match.tournamentId === tournamentId && (match.sets.length > 0 || match.forfeit),
  )
  const filled = names.map((name) => name.trim()).filter(Boolean).length
  const plan = filled >= 2 && filled % 2 === 0 ? championPlan(filled / 2) : ''

  function changeName(index: number, value: string) {
    setNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleaned = names.map((name) => name.trim()).filter(Boolean)
    const reason = startBlockReason(cleaned.length, false)
    if (reason) {
      setError(reason)
      return
    }
    if (played && !window.confirm('Tạo giải sẽ ghép cặp ngẫu nhiên và xếp lại lịch. Tỷ số hiện có sẽ mất.')) return
    const message = store.savePlayersAndRedraw(tournamentId, cleaned)
    setNames(cleaned)
    setError(message ?? '')
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-line">
      <h2 className="font-extrabold">Thành viên</h2>
      <p className="mt-1 text-sm text-muted">
        Bấm Tạo giải để ghép ngẫu nhiên 2 người thành 1 đội và xếp lịch thi đấu.
        {plan ? ` ${plan}` : ''}
      </p>
      <div className="mt-3 space-y-2">
        {names.map((name, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              aria-label={`Người chơi ${index + 1}`}
              className={fieldClass}
              value={name}
              onChange={(event) => changeName(index, event.target.value)}
              required
            />
            <button
              type="button"
              className="shrink-0 text-sm font-semibold text-live"
              onClick={() => setNames((current) => current.filter((_, nameIndex) => nameIndex !== index))}
            >
              Bỏ
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 text-sm font-bold text-court"
        onClick={() => setNames((current) => [...current, ''])}
      >
        Thêm tên
      </button>
      {error ? <p className="mt-3 text-sm font-semibold text-live">{error}</p> : null}
      <button type="submit" className="mt-3 w-full rounded-2xl bg-court py-3 font-bold text-white">
        Tạo giải
      </button>
    </form>
  )
}

