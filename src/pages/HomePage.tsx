import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MatchCard } from '../components/MatchCard.tsx'
import { Standings } from '../components/Standings.tsx'
import { Badge, fieldClass } from '../components/ui.tsx'
import { organizerSignedIn, watchOrganizerAuth } from '../lib/auth.ts'
import { formatTime, placeLine, todayInVietnam, tournamentOnDay } from '../lib/format.ts'
import { countResults, currentAndNextMatches, draftScore, firstUnfinishedMatch, pairNames, parseScore, setIsComplete, tournamentChampion, viewMatch } from '../lib/results.ts'
import { useTournamentStore } from '../store/context.ts'
import type { Match } from '../types.ts'

export function HomePage({ scope }: { scope: 'today' | 'history' }) {
  const { data, deleteTournament, source, updateMatch } = useTournamentStore()
  const today = todayInVietnam()
  const [organizer, setOrganizer] = useState(organizerSignedIn)
  const [homeTab, setHomeTab] = useState<'bxh' | 'lich'>('bxh')

  useEffect(() => {
    document.title = scope === 'today' ? 'Pickleball Thuỷ Lợi' : 'Lịch sử các giải · Pickleball Thuỷ Lợi'
  }, [scope])

  useEffect(() => watchOrganizerAuth(() => setOrganizer(organizerSignedIn())), [])

  const tournaments = [...data.tournaments]
    .filter((tournament) =>
      scope === 'today' ? tournamentOnDay(tournament.startDate, tournament.endDate, today) : true,
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.name.localeCompare(b.name))

  return (
    <div className="pb-8">
      {scope === 'today' ? (
        <HomeHero count={tournaments.length} />
      ) : (
        <section className="-mx-4 -mt-5 bg-court px-4 pb-6 pt-2 text-white">
          <h1 className="mt-1 max-w-xl text-3xl font-extrabold leading-tight">Lịch sử các giải</h1>
        </section>
      )}

      <div className="mt-4 space-y-4">
        {scope === 'today' && !organizer && tournaments.length > 0 ? (
          <div role="tablist" aria-label="Nội dung trang chính" className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-1 ring-1 ring-line">
            <button
              type="button"
              role="tab"
              aria-selected={homeTab === 'bxh'}
              className={`rounded-xl px-2 py-2.5 text-sm font-semibold ${homeTab === 'bxh' ? 'bg-court text-white' : 'text-ink'}`}
              onClick={() => setHomeTab('bxh')}
            >
              Bảng xếp hạng
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={homeTab === 'lich'}
              className={`rounded-xl px-2 py-2.5 text-sm font-semibold ${homeTab === 'lich' ? 'bg-court text-white' : 'text-ink'}`}
              onClick={() => setHomeTab('lich')}
            >
              Lịch thi đấu
            </button>
          </div>
        ) : null}
        {tournaments.length === 0 ? (
          <p className="rounded-3xl bg-card p-5 text-sm text-muted ring-1 ring-line">
            {scope === 'today' ? 'Hôm nay không có giải nào.' : 'Chưa có giải nào.'}
          </p>
        ) : (
          <div className="space-y-4">
            {tournaments.map((tournament) => {
              const matches = data.matches.filter((match) => match.tournamentId === tournament.id)
              const current = firstUnfinishedMatch(matches)
              const progress = countResults(matches)
              const champion = tournamentChampion(tournament.id, data)
              return (
                <article key={tournament.id} className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-line">
                  {scope === 'today' ? <div className="h-1.5 bg-gradient-to-r from-court via-ball to-court" /> : null}
                  <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    {tournament.status === 'live' ? (
                      <Badge tone="live">Đang diễn ra</Badge>
                    ) : tournament.status === 'upcoming' ? (
                      <Badge tone="soon">Sắp diễn ra</Badge>
                    ) : (
                      <Badge tone="done">Đã kết thúc</Badge>
                    )}
                    <span className="text-xs font-semibold text-muted">{tournament.category}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2">
                    <h2 className="text-xl font-extrabold leading-snug">{tournament.name}</h2>
                    <p className="text-xs text-muted">
                      {progress.done}/{progress.total} trận đã có kết quả
                      {progress.live > 0 ? ` · ${progress.live} trận đang đấu` : ''}
                    </p>
                  </div>
                  {placeLine(tournament.venue, tournament.city) ? (
                    <p className="mt-1 text-sm text-muted">{placeLine(tournament.venue, tournament.city)}</p>
                  ) : null}
                  {champion ? <p className="mt-2 text-sm font-bold text-court">Vô địch: {champion.name}</p> : null}
                  {scope === 'today' && organizer ? (
                    <LiveScoreDesk
                      matches={current ? [current] : []}
                      pointsPerSet={tournament.config.pointsPerSet}
                      onSave={(match, score) => {
                        const finished = setIsComplete(score, tournament.config.pointsPerSet)
                        updateMatch(
                          match.id,
                          { sets: [score], court: match.court, scheduledAt: match.scheduledAt, forfeit: null },
                          finished ? 'Trận đã kết thúc.' : 'Đã cập nhật tỷ số. Trận vẫn đang đấu.',
                        )
                      }}
                    />
                  ) : scope === 'today' && homeTab === 'lich' ? (
                    <HomeSchedule matches={matches} currentId={current?.id ?? null} />
                  ) : scope === 'today' ? (
                    <Standings tournamentId={tournament.id} data={data} embedded />
                  ) : null}
                  {organizer && scope === 'history' ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Link
                        to={`/ban-to-chuc?viec=lich-su&giai=${tournament.id}`}
                        className="inline-flex justify-center rounded-2xl bg-court px-4 py-3 text-sm font-bold text-white"
                      >
                        Chỉnh sửa
                      </Link>
                      <button
                        type="button"
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-live ring-1 ring-line"
                        onClick={() => {
                          if (!window.confirm(`Xóa "${tournament.name}"? Lịch, cặp đấu và tỷ số của giải này sẽ mất.`)) return
                          deleteTournament(tournament.id)
                        }}
                      >
                        Xóa giải
                      </button>
                    </div>
                  ) : organizer ? (
                    <Link
                      to={`/ban-to-chuc?viec=lich-su&giai=${tournament.id}`}
                      className="mt-4 inline-flex rounded-full bg-court px-4 py-2.5 text-sm font-bold text-white"
                    >
                      Chỉnh sửa
                    </Link>
                  ) : scope === 'history' ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Link
                        to={`/giai/${tournament.id}?muc=bxh`}
                        className="inline-flex justify-center rounded-2xl bg-court px-4 py-3 text-sm font-bold text-white"
                      >
                        Xem kết quả
                      </Link>
                      <Link
                        to={`/ban-to-chuc?viec=lich-su&giai=${tournament.id}`}
                        className="inline-flex justify-center rounded-2xl bg-white px-4 py-3 text-sm font-bold text-court ring-1 ring-line"
                      >
                        Chỉnh sửa
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to={`/giai/${tournament.id}?muc=lich`}
                      className="mt-4 inline-flex rounded-full bg-court px-4 py-2.5 text-sm font-bold text-white"
                    >
                      Xem giải
                    </Link>
                  )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
        <p className="text-center text-xs text-muted">
          {source === 'remote' ? 'Dữ liệu lưu trên Cloudflare D1.' : 'Dữ liệu mẫu đang lưu trên trình duyệt này.'}
        </p>
      </div>
    </div>
  )
}

function HomeSchedule({ matches, currentId }: { matches: Match[]; currentId: string | null }) {
  const { data } = useTournamentStore()
  const rows = currentAndNextMatches(matches)
  if (rows.length === 0) return <p className="mt-4 text-sm text-muted">Không có trận đang đấu.</p>
  return (
    <div className="mt-4 space-y-3">
      {rows.map((match) => (
        <MatchCard
          key={match.id}
          view={viewMatch(match, data)}
          teams={data.teams}
          players={data.players}
          groupName={data.groups.find((group) => group.id === match.groupId)?.name}
          playing={match.id === currentId}
        />
      ))}
    </div>
  )
}

function LiveScoreDesk({
  matches,
  pointsPerSet,
  onSave,
}: {
  matches: Match[]
  pointsPerSet: number
  onSave: (match: Match, score: { a: number; b: number }) => void
}) {
  const { data } = useTournamentStore()
  const ordered = [...matches].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

  return (
    <div className="mt-4 space-y-3">
      {ordered.length === 0 ? (
        <p className="rounded-2xl bg-sand px-3 py-3 text-sm text-muted">Không có trận đang đấu.</p>
      ) : (
        ordered.map((match) => {
          const view = viewMatch(match, data)
          const teamA = data.teams.find((team) => team.id === view.sideA.teamId)
          const teamB = data.teams.find((team) => team.id === view.sideB.teamId)
          const nameA = pairNames(teamA, data.players) || view.sideA.label
          const nameB = pairNames(teamB, data.players) || view.sideB.label
          const groupName = data.groups.find((group) => group.id === match.groupId)?.name
          return (
            <LiveScoreForm
              key={`${match.id}:${match.sets[0]?.a ?? 0}-${match.sets[0]?.b ?? 0}`}
              match={match}
              nameA={nameA}
              nameB={nameB}
              groupName={groupName}
              pointsPerSet={pointsPerSet}
              onSave={(score) => onSave(match, score)}
            />
          )
        })
      )}
    </div>
  )
}

function LiveScoreForm({
  match,
  nameA,
  nameB,
  groupName,
  pointsPerSet,
  onSave,
}: {
  match: Match
  nameA: string
  nameB: string
  groupName?: string
  pointsPerSet: number
  onSave: (score: { a: number; b: number }) => void
}) {
  const current = match.sets[0] ?? { a: 0, b: 0 }
  const [scoreA, setScoreA] = useState(String(current.a))
  const [scoreB, setScoreB] = useState(String(current.b))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ a: parseScore(scoreA), b: parseScore(scoreB) })
  }

  const ready = setIsComplete({ a: parseScore(scoreA), b: parseScore(scoreB) }, pointsPerSet)

  return (
    <form onSubmit={submit} className="rounded-2xl bg-sand p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted">
          {formatTime(match.scheduledAt)} · {match.court}
          {groupName ? ` · ${groupName}` : ''}
        </p>
        <Badge tone="live">Đang đấu</Badge>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="text-sm font-semibold">
          <span className="mb-1 block truncate">{nameA}</span>
          <input
            aria-label={`Tỷ số ${nameA}`}
            inputMode="numeric"
            type="text"
            maxLength={2}
            className={fieldClass}
            value={scoreA}
            onChange={(event) => setScoreA(draftScore(event.target.value))}
          />
        </label>
        <span className="pb-3 text-sm font-bold text-muted">tỷ số</span>
        <label className="text-sm font-semibold">
          <span className="mb-1 block truncate text-right">{nameB}</span>
          <input
            aria-label={`Tỷ số ${nameB}`}
            inputMode="numeric"
            type="text"
            maxLength={2}
            className={fieldClass}
            value={scoreB}
            onChange={(event) => setScoreB(draftScore(event.target.value))}
          />
        </label>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted">
        {ready ? 'Tỷ số này sẽ kết thúc trận.' : 'Trận vẫn đang đấu với tỷ số này.'}
      </p>
      <button type="submit" className="mt-3 w-full rounded-2xl bg-court py-3 text-sm font-bold text-white">
        Lưu tỷ số
      </button>
    </form>
  )
}

function HomeHero({ count }: { count: number }) {
  return (
    <section className="-mx-4 -mt-5">
      <h1 className="sr-only">Kết quả giải pickleball</h1>
      <img
        src="/trang-chu.jpg"
        alt="Ảnh chính của Pickleball Thuỷ Lợi"
        className="aspect-[15/8] w-full object-cover object-[center_42%] sm:aspect-[2/1]"
      />
      <div className="flex items-center justify-between gap-3 bg-court px-4 py-3 text-white">
        <p className="flex items-center gap-2 text-sm font-bold">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-ball" />
          Giải hôm nay
        </p>
        <p className="rounded-full bg-ball px-3 py-1 text-xs font-extrabold text-court">{count} giải</p>
      </div>
    </section>
  )
}
