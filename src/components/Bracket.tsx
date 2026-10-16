import type { Match, StoreData } from '../types.ts'
import { formatTime } from '../lib/format.ts'
import { viewMatch } from '../lib/results.ts'
import { MatchCard } from './MatchCard.tsx'

function Node({ match, data }: { match: Match; data: StoreData }) {
  const view = viewMatch(match, data)
  const lines = [view.sideA, view.sideB]
  return (
    <article className="w-64 shrink-0 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-line">
      <p className="text-xs font-semibold text-muted">
        {match.roundLabel} · {formatTime(match.scheduledAt)} · {match.court}
      </p>
      <div className="mt-2 space-y-2">
        {lines.map((side, index) => (
          <div key={`${match.id}-${index}`} className="flex items-center justify-between gap-2">
            <p className={`min-w-0 truncate text-sm ${view.winnerId === side.teamId ? 'font-extrabold' : 'font-semibold'}`}>
              {side.label}
            </p>
            {side.projected ? <span className="shrink-0 text-[10px] font-bold uppercase text-court">Dự kiến</span> : null}
          </div>
        ))}
      </div>
      {match.sets.length > 0 ? (
        <p className="mt-2 text-sm font-bold tabular-nums text-court">
          {match.sets.map((set) => `${set.a}–${set.b}`).join('  ·  ')}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">Chưa có tỷ số</p>
      )}
    </article>
  )
}

function Column({ title, matches, data }: { title: string; matches: Match[]; data: StoreData }) {
  if (matches.length === 0) return null
  return (
    <div className="flex shrink-0 flex-col justify-center gap-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
      {matches.map((match) => (
        <Node key={match.id} match={match} data={data} />
      ))}
    </div>
  )
}

export function Bracket({ tournamentId, data }: { tournamentId: string; data: StoreData }) {
  const matches = data.matches
    .filter((match) => match.tournamentId === tournamentId && match.stage === 'knockout')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted">
        Giải đánh vòng tròn. Mỗi đội chỉ gặp nhau một set, nên không có nhánh đấu lại.
      </p>
    )
  }

  const quarters = matches.filter((match) => match.roundLabel === 'Tứ kết')
  const semis = matches.filter((match) => match.roundLabel === 'Bán kết')
  const finals = matches.filter((match) => match.roundLabel === 'Chung kết' || match.roundLabel === 'Tranh hạng 3')
  const showBoard = quarters.length + semis.length + finals.length > 0

  return (
    <div className="space-y-6">
      {showBoard ? (
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-stretch gap-3">
            <Column title="Tứ kết" matches={quarters} data={data} />
            {quarters.length > 0 && semis.length > 0 ? (
              <div className="flex items-center text-2xl text-court/30" aria-hidden="true">
                →
              </div>
            ) : null}
            <Column title="Bán kết" matches={semis} data={data} />
            {semis.length > 0 && finals.length > 0 ? (
              <div className="flex items-center text-2xl text-court/30" aria-hidden="true">
                →
              </div>
            ) : null}
            <Column title="Chung kết" matches={finals} data={data} />
          </div>
        </div>
      ) : null}
      <p className="text-sm text-muted">
        Đôi in mờ chữ “Dự kiến” là thứ hạng tạm. Khi vòng bảng xong, vị trí đó được chốt và đôi thắng sẽ đi tiếp.
      </p>
      <div className="space-y-3">
        {matches.map((match) => (
          <MatchCard key={match.id} view={viewMatch(match, data)} teams={data.teams} players={data.players} />
        ))}
      </div>
    </div>
  )
}
