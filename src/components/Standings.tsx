import type { StoreData } from '../types.ts'
import { formatDiff } from '../lib/format.ts'
import { pairNames, rulesLines, standingsForGroup } from '../lib/results.ts'

export function Standings({
  tournamentId,
  data,
  embedded = false,
}: {
  tournamentId: string
  data: StoreData
  embedded?: boolean
}) {
  const tournament = data.tournaments.find((item) => item.id === tournamentId)
  const groups = data.groups.filter((item) => item.tournamentId === tournamentId)
  if (!tournament) return null
  const pad = embedded ? 'px-1.5 py-2' : 'px-2 py-3'
  const edge = embedded ? 'px-2 py-2' : 'px-3 py-3'
  const rankCell = embedded ? '' : 'sticky left-0 bg-card'
  const nameCell = embedded ? '' : 'sticky left-10 bg-card'

  return (
    <div className={embedded ? 'mt-4 space-y-4' : 'space-y-5'}>
      {embedded ? null : (
        <div className="rounded-3xl bg-card p-4 text-sm text-muted ring-1 ring-line">
          <p className="font-semibold text-ink">Cách tính của giải này</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {rulesLines(tournament.config).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {groups.length === 0 ? <p className="text-sm text-muted">Chưa có bảng đấu.</p> : null}
      {groups.map((group) => {
        const rows = standingsForGroup(group.id, data)
        return (
          <section key={group.id}>
            <h3 className={embedded ? 'mb-2 font-extrabold' : 'mb-2 text-lg font-extrabold'}>{group.name}</h3>
            <div className={embedded ? 'overflow-x-auto rounded-2xl bg-sand' : 'overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-line'}>
              <table className={`w-full border-collapse ${embedded ? 'table-fixed text-xs' : 'min-w-[34rem] text-sm'}`}>
                {embedded ? (
                  <colgroup>
                    <col className="w-8" />
                    <col />
                    <col className="w-10" />
                    <col className="w-12" />
                    <col className="w-9" />
                    <col className="w-9" />
                    <col className="w-10" />
                  </colgroup>
                ) : null}
                <thead>
                  <tr className="border-b border-line text-left text-xs font-bold text-muted">
                    <th className={`${rankCell} ${edge}`}>#</th>
                    <th className={`${nameCell} ${pad}`}>Đôi</th>
                    <th className={`${pad} text-right`}>Điểm</th>
                    <th className={`${pad} text-right`} title="Điểm ghi trừ điểm thua">
                      Hiệu số
                    </th>
                    <th className={`${pad} text-right`}>Thắng</th>
                    <th className={`${pad} text-right`}>Thua</th>
                    <th className={`${edge} text-right`}>Trận</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const team = data.teams.find((item) => item.id === row.teamId)
                    const pointDiff = row.pointsWon - row.pointsLost
                    return (
                      <tr key={row.teamId} className="border-b border-line last:border-0">
                        <td className={`${rankCell} ${edge} font-extrabold`}>{row.rank}</td>
                        <td className={`${nameCell} ${pad}`}>
                          <p className={embedded ? 'truncate font-extrabold' : 'max-w-40 truncate font-extrabold sm:max-w-none'}>
                            {pairNames(team, data.players) || team?.name || 'Đôi'}
                          </p>
                          {row.forfeits > 0 ? (
                            <p className="text-xs font-semibold text-live">{row.forfeits} bỏ cuộc</p>
                          ) : null}
                        </td>
                        <td className={`${pad} text-right text-base font-extrabold tabular-nums text-court`}>{row.points}</td>
                        <td className={`${pad} text-right font-semibold tabular-nums`}>{formatDiff(pointDiff)}</td>
                        <td className={`${pad} text-right font-semibold tabular-nums`}>{row.wins}</td>
                        <td className={`${pad} text-right font-semibold tabular-nums`}>{row.losses}</td>
                        <td className={`${edge} text-right font-semibold tabular-nums`}>{row.played}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
