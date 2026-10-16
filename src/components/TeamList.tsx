import { useState } from 'react'
import { pairNames } from '../lib/results.ts'
import type { StoreData } from '../types.ts'

function NameField({
  label,
  value,
  onCommit,
}: {
  label: string
  value: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? value
  return (
    <input
      aria-label={label}
      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-court/30"
      value={shown}
      onFocus={() => setDraft(value)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => {
        const next = event.currentTarget.value.trim()
        if (next && next !== value) onCommit(next)
        setDraft(null)
      }}
    />
  )
}

export function TeamList({
  tournamentId,
  data,
  onPlayerName,
}: {
  tournamentId: string
  data: StoreData
  onPlayerName: (playerId: string, name: string) => void
}) {
  const groups = data.groups.filter((group) => group.tournamentId === tournamentId)
  const teams = data.teams.filter((team) => team.tournamentId === tournamentId)
  const placed = new Set(groups.flatMap((group) => group.teamIds))
  const loose = teams.filter((team) => !placed.has(team.id))

  function renderTeam(teamId: string) {
    const team = teams.find((item) => item.id === teamId)
    if (!team) return null
    const members = team.playerIds
      .map((id) => data.players.find((player) => player.id === id))
      .filter((player) => player !== undefined)
    return (
      <article key={team.id} className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-line">
        <p className="text-sm font-semibold text-muted">{pairNames(team, data.players)}</p>
        <ul className="mt-3 space-y-2">
          {members.map((member, index) => (
            <li key={member.id}>
              <NameField
                label={`Thành viên ${index + 1} của ${pairNames(team, data.players)}`}
                value={member.name}
                onCommit={(name) => onPlayerName(member.id, name)}
              />
            </li>
          ))}
        </ul>
      </article>
    )
  }

  if (teams.length === 0) return <p className="text-sm text-muted">Chưa có thành viên. Hãy nhập tên hai người trong một đôi.</p>

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.id} className="space-y-2">
          <h3 className="text-lg font-extrabold">{group.name}</h3>
          {group.teamIds.length === 0 ? <p className="text-sm text-muted">Bảng này chưa có đôi.</p> : null}
          {group.teamIds.map((teamId) => renderTeam(teamId))}
        </section>
      ))}
      {loose.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-lg font-extrabold">Chưa xếp bảng</h3>
          {loose.map((team) => renderTeam(team.id))}
        </section>
      ) : null}
    </div>
  )
}
