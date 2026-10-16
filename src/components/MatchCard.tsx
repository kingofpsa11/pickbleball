import { useState } from 'react'
import type { FocusEvent } from 'react'
import type { ReactNode } from 'react'
import type { Player, Team } from '../types.ts'
import type { MatchView } from '../lib/results.ts'
import { draftScore, pairNames, parseScore } from '../lib/results.ts'
import { formatTime } from '../lib/format.ts'
import { Badge } from './ui.tsx'

function SideLine({
  name,
  pair,
  projected,
  sets,
  side,
  winner,
  teamId,
  forfeited,
  score,
}: {
  name: string
  pair: string
  projected: boolean
  sets: { a: number; b: number }[]
  side: 'a' | 'b'
  winner: string | null
  teamId: string | null
  forfeited: boolean
  score?: ReactNode
}) {
  const won = Boolean(winner && teamId && winner === teamId)
  return (
    <>
      <div className="min-w-0">
        <p className={`truncate ${won ? 'font-extrabold' : 'font-semibold'}`}>
          {name}
          {projected ? <span className="ml-2 align-middle"><Badge tone="projected">Dự kiến</Badge></span> : null}
        </p>
        {pair ? <p className="truncate text-sm text-muted">{pair}</p> : null}
      </div>
      <div className="flex items-center justify-end gap-1">
        {score ?? (forfeited ? (
          <span className="rounded-lg bg-live/10 px-2 py-1 text-xs font-bold text-live">Bỏ cuộc</span>
        ) : sets.length === 0 ? (
          <span className="text-muted">–</span>
        ) : (
          sets.map((set, index) => {
            const mine = side === 'a' ? set.a : set.b
            const other = side === 'a' ? set.b : set.a
            return (
              <span
                key={`${side}-${index}`}
                className={`inline-grid h-8 w-8 place-items-center rounded-lg text-sm tabular-nums ${
                  mine > other ? 'bg-court font-extrabold text-white' : 'bg-sand font-semibold text-muted'
                }`}
              >
                {mine}
              </span>
            )
          })
        ))}
      </div>
    </>
  )
}

function readScore(raw: string) {
  return parseScore(raw)
}

const scoreInputClass =
  'h-10 w-14 rounded-xl border border-line bg-white text-center text-base font-extrabold tabular-nums text-ink outline-none [appearance:textfield] focus:border-court focus:ring-2 focus:ring-court/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

export function MatchCard({
  view,
  teams,
  players,
  groupName,
  onScore,
  playing = false,
}: {
  view: MatchView
  teams: Team[]
  players: Player[]
  groupName?: string
  onScore?: (score: { a: number; b: number }) => void
  playing?: boolean
}) {
  const { match } = view
  const savedA = match.sets[0]?.a ?? 0
  const savedB = match.sets[0]?.b ?? 0
  const [scoreA, setScoreA] = useState(String(savedA))
  const [scoreB, setScoreB] = useState(String(savedB))
  const teamA = teams.find((team) => team.id === view.sideA.teamId)
  const teamB = teams.find((team) => team.id === view.sideB.teamId)
  const nameA = pairNames(teamA, players) || view.sideA.label
  const nameB = pairNames(teamB, players) || view.sideB.label
  const inPlay = playing && match.status !== 'finished'
  const status = inPlay ? (
    <Badge tone="live">Đang đấu</Badge>
  ) : match.status === 'finished' ? (
    <Badge tone="done">Đã xong</Badge>
  ) : (
    <Badge tone="muted">Chưa đấu</Badge>
  )

  function commitWhenLeaving(event: FocusEvent<HTMLInputElement>) {
    if (!onScore) return
    const card = event.currentTarget.closest('article')
    const nextFocus = event.relatedTarget
    if (!card || (nextFocus instanceof Node && card.contains(nextFocus))) return
    const inputs = [...card.querySelectorAll('input')]
    const next = {
      a: readScore(inputs[0]?.value ?? ''),
      b: readScore(inputs[1]?.value ?? ''),
    }
    if (next.a === savedA && next.b === savedB) return
    if (next.a === 0 && next.b === 0 && match.sets.length === 0 && !match.forfeit) return
    onScore(next)
  }

  function scoreField(name: string, value: string, onChange: (value: string) => void) {
    return (
      <input
        aria-label={`Tỷ số ${name}`}
        inputMode="numeric"
        type="text"
        maxLength={2}
        className={scoreInputClass}
        value={value}
        onChange={(event) => onChange(draftScore(event.target.value))}
        onBlur={commitWhenLeaving}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
    )
  }

  return (
    <article
      className={`rounded-3xl bg-card p-4 shadow-sm ${
        inPlay ? 'border-2 border-live' : 'ring-1 ring-line'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">
          {formatTime(match.scheduledAt)} · {match.court}
        </p>
        {status}
      </div>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {match.roundLabel}
        {groupName ? ` · ${groupName}` : ''}
      </p>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3">
        <SideLine
          name={nameA}
          pair=""
          projected={view.sideA.projected}
          sets={match.sets}
          side="a"
          winner={view.winnerId}
          teamId={view.sideA.teamId}
          forfeited={match.forfeit === 'A'}
          score={onScore ? scoreField(nameA, scoreA, setScoreA) : undefined}
        />
        <SideLine
          name={nameB}
          pair=""
          projected={view.sideB.projected}
          sets={match.sets}
          side="b"
          winner={view.winnerId}
          teamId={view.sideB.teamId}
          forfeited={match.forfeit === 'B'}
          score={onScore ? scoreField(nameB, scoreB, setScoreB) : undefined}
        />
      </div>
    </article>
  )
}
