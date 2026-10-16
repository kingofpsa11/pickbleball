import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { MatchCard } from '../components/MatchCard.tsx'
import { Standings } from '../components/Standings.tsx'
import { Badge, SectionTabs } from '../components/ui.tsx'
import type { TabItem } from '../components/ui.tsx'
import { formatRange, placeLine } from '../lib/format.ts'
import { firstUnfinishedMatch, tournamentChampion, viewMatch } from '../lib/results.ts'
import { useTournamentStore } from '../store/context.ts'

const sections = [
  { id: 'lich', label: 'Lịch thi đấu', short: 'Lịch' },
  { id: 'dang-dau', label: 'Các trận đang đấu', short: 'Đang đấu' },
  { id: 'bxh', label: 'Bảng xếp hạng', short: 'BXH' },
]

export function TournamentPage() {
  const { tournamentId = '' } = useParams()
  const { data } = useTournamentStore()
  const [search] = useSearchParams()
  const tournament = data.tournaments.find((item) => item.id === tournamentId)
  const requested = search.get('muc') ?? 'lich'
  const muc = sections.some((item) => item.id === requested) ? requested : 'lich'

  useEffect(() => {
    document.title = tournament ? `${tournament.name} · Pickleball Thuỷ Lợi` : 'Pickleball Thuỷ Lợi'
  }, [tournament])

  if (!tournament) {
    return (
      <div className="rounded-3xl bg-card p-6 ring-1 ring-line">
        <h1 className="text-xl font-extrabold">Không tìm thấy giải này</h1>
        <Link to="/" className="mt-3 inline-block font-semibold text-court">
          Về trang chủ
        </Link>
      </div>
    )
  }

  const matches = data.matches
    .filter((match) => match.tournamentId === tournament.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const current = firstUnfinishedMatch(matches)
  const champion = tournamentChampion(tournament.id, data)
  const tabs: TabItem[] = sections.map((item) => ({
    ...item,
    to: `/giai/${tournament.id}?muc=${item.id}`,
  }))

  return (
    <div className="pb-8">
      <Link to="/" className="text-sm font-semibold text-court">
        ← Hôm nay
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tournament.status === 'live' ? (
          <Badge tone="live">Đang diễn ra</Badge>
        ) : tournament.status === 'upcoming' ? (
          <Badge tone="soon">Sắp diễn ra</Badge>
        ) : (
          <Badge tone="done">Đã kết thúc</Badge>
        )}
        <span className="text-sm font-semibold text-muted">{tournament.category}</span>
      </div>
      <h1 className="mt-2 text-2xl font-extrabold leading-snug">{tournament.name}</h1>
      {placeLine(tournament.venue, tournament.city) ? (
        <p className="mt-1 text-sm text-muted">{placeLine(tournament.venue, tournament.city)}</p>
      ) : null}
      <p className="text-sm font-semibold">{formatRange(tournament.startDate, tournament.endDate)}</p>
      {champion ? <p className="mt-2 text-sm font-extrabold">Vô địch: {champion.name}</p> : null}

      <div className="mt-5">
        <SectionTabs items={tabs} current={muc} label="Mục của giải" />
        {muc === 'lich' ? (
          <MatchList matches={matches} dataGroups={data} currentId={current?.id ?? null} empty="Chưa có lịch thi đấu." />
        ) : null}
        {muc === 'dang-dau' ? (
          <MatchList
            matches={current ? [current] : []}
            dataGroups={data}
            currentId={current?.id ?? null}
            empty="Không có trận đang đấu."
          />
        ) : null}
        {muc === 'bxh' ? <Standings tournamentId={tournament.id} data={data} /> : null}
      </div>
    </div>
  )
}

function MatchList({
  matches,
  dataGroups,
  currentId,
  empty,
}: {
  matches: ReturnType<typeof useTournamentStore>['data']['matches']
  dataGroups: ReturnType<typeof useTournamentStore>['data']
  currentId: string | null
  empty: string
}) {
  const rows = [...matches].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>
  return (
    <div className="space-y-3">
      {rows.map((match) => (
        <MatchCard
          key={match.id}
          view={viewMatch(match, dataGroups)}
          teams={dataGroups.teams}
          players={dataGroups.players}
          groupName={dataGroups.groups.find((group) => group.id === match.groupId)?.name}
          playing={match.id === currentId}
        />
      ))}
    </div>
  )
}
