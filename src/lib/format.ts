import type { Match } from '../types.ts'

const WEEKDAY: Record<string, string> = {
  Sun: 'Chủ nhật',
  Mon: 'Thứ hai',
  Tue: 'Thứ ba',
  Wed: 'Thứ tư',
  Thu: 'Thứ năm',
  Fri: 'Thứ sáu',
  Sat: 'Thứ bảy',
}

function parts(iso: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    ...options,
  }).formatToParts(new Date(iso))
}

function grab(list: Intl.DateTimeFormatPart[], type: string) {
  return list.find((part) => part.type === type)?.value ?? ''
}

export function placeLine(venue: string, city: string) {
  return [venue, city].map((item) => item.trim()).filter(Boolean).join(' · ')
}

export function formatRange(start: string, end: string) {
  const [startYear, startMonth, startDay] = start.split('-')
  const [endYear, endMonth, endDay] = end.split('-')
  if (start === end) return `${startDay}/${startMonth}/${startYear}`
  if (startYear === endYear) return `${startDay}/${startMonth} – ${endDay}/${endMonth}/${endYear}`
  return `${startDay}/${startMonth}/${startYear} – ${endDay}/${endMonth}/${endYear}`
}

export function formatTime(iso: string) {
  const list = parts(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return `${grab(list, 'hour')}:${grab(list, 'minute')}`
}

export function formatLongDay(iso: string) {
  const list = parts(iso, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const weekday = WEEKDAY[grab(list, 'weekday')] ?? ''
  return `${weekday}, ${grab(list, 'day')}/${grab(list, 'month')}/${grab(list, 'year')}`
}

export function dayKey(iso: string) {
  const list = parts(iso, { year: 'numeric', month: '2-digit', day: '2-digit' })
  return `${grab(list, 'year')}-${grab(list, 'month')}-${grab(list, 'day')}`
}

export function todayInVietnam() {
  return dayKey(new Date().toISOString())
}

export function tournamentOnDay(startDate: string, endDate: string, day: string) {
  return startDate <= day && day <= endDate
}

export function groupByDay(matches: Match[]) {
  const sorted = [...matches].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const groups: { key: string; label: string; matches: Match[] }[] = []
  for (const match of sorted) {
    const key = dayKey(match.scheduledAt)
    const current = groups.find((group) => group.key === key)
    if (current) current.matches.push(match)
    else groups.push({ key, label: formatLongDay(match.scheduledAt), matches: [match] })
  }
  return groups
}

export function formatDiff(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

export function toDateTimeLocalValue(iso: string) {
  const matched = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso)
  if (!matched) return ''
  return `${matched[1]}T${matched[2]}`
}

export function toVietnamIso(localValue: string) {
  return `${localValue}:00+07:00`
}
