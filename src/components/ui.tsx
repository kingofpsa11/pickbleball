import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { organizerSignedIn, signOut } from '../lib/auth.ts'

export const fieldClass =
  'w-full rounded-xl border border-line bg-white px-3 py-3 text-base text-ink outline-none focus:border-court focus:ring-2 focus:ring-court/30'

type Tone = 'live' | 'soon' | 'done' | 'muted' | 'projected'

const toneClass: Record<Tone, string> = {
  live: 'bg-live text-white',
  soon: 'bg-ball text-court',
  done: 'bg-court/10 text-court',
  muted: 'bg-sand text-muted',
  projected: 'bg-white text-court ring-1 ring-dashed ring-court/40',
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${toneClass[tone]}`}>
      {tone === 'live' ? <span className="live-dot mr-1.5 inline-block h-2 w-2 rounded-full bg-white" /> : null}
      {children}
    </span>
  )
}

export function BallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#e4f56a" />
      <circle cx="11.5" cy="12" r="1.3" fill="#0e3b2e" />
      <circle cx="17.5" cy="10.5" r="1.3" fill="#0e3b2e" />
      <circle cx="14" cy="17" r="1.3" fill="#0e3b2e" />
      <circle cx="20" cy="16" r="1.3" fill="#0e3b2e" />
      <circle cx="17.5" cy="21.5" r="1.3" fill="#0e3b2e" />
    </svg>
  )
}

type MenuIconName = 'history' | 'plus' | 'login' | 'logout'

function MenuGlyph({ name }: { name: MenuIconName }) {
  const common = 'h-5 w-5 shrink-0'
  if (name === 'history') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M7 10.5V19h10v-8.5" />
      </svg>
    )
  }
  if (name === 'plus') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    )
  }
  if (name === 'logout') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" />
        <path d="M4 12h11M12 8l4 4-4 4" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
    </svg>
  )
}

export function SiteHeader({ organizer = false, onLogout }: { organizer?: boolean; onLogout?: () => void }) {
  const location = useLocation()
  const [search] = useSearchParams()
  const here = `${location.pathname}${location.search}`
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === here
  const task = search.get('viec') === 'them' ? 'them' : 'lich-su'
  const [signedIn, setSignedIn] = useState(organizerSignedIn)
  const items: { id: string; label: string; to: string; icon: MenuIconName }[] = signedIn
    ? [
        { id: 'lich-su', label: 'Lịch sử các giải', to: '/lich-su', icon: 'history' },
        { id: 'them', label: 'Tạo giải', to: '/ban-to-chuc?viec=them', icon: 'plus' },
      ]
    : [{ id: 'dang-nhap', label: 'Đăng nhập ban tổ chức', to: '/ban-to-chuc/dang-nhap', icon: 'login' }]
  const current =
    location.pathname.startsWith('/ban-to-chuc/dang-nhap')
      ? 'dang-nhap'
      : location.pathname.startsWith('/ban-to-chuc') && task === 'them'
        ? 'them'
        : location.pathname === '/lich-su' || (organizer && task !== 'them')
          ? 'lich-su'
          : ''

  function closeMenu() {
    setOpenPath(null)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-court">
          <BallIcon className="h-9 w-9 shrink-0" />
          <span className="truncate text-base font-extrabold tracking-tight">Pickleball Thuỷ Lợi</span>
        </Link>
        <button
          type="button"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          aria-controls="main-menu"
          className="grid h-10 w-10 place-items-center text-[#2f8f4e]"
          onClick={() => setOpenPath(open ? null : here)}
        >
          {open ? (
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>
      {open ? (
        <>
          <button type="button" aria-label="Đóng menu" className="fixed inset-0 top-[65px] z-40 bg-ink/20" onClick={closeMenu} />
          <nav id="main-menu" aria-label="Menu chính" className="absolute inset-x-0 top-full z-50 border-b border-line bg-white shadow-lg">
            <div className="mx-auto max-w-5xl">
              {items.map((item) => {
                const active = item.id === current
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 border-r-4 px-4 py-3.5 text-[15px] font-semibold ${
                      active ? 'border-[#2f8f4e] bg-[#e7f4ea] text-[#1e6b3a]' : 'border-transparent text-ink'
                    }`}
                    onClick={closeMenu}
                  >
                    <MenuGlyph name={item.icon} />
                    {item.label}
                  </Link>
                )
              })}
              {signedIn ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-r-4 border-transparent px-4 py-3.5 text-left text-[15px] font-semibold text-live"
                  onClick={() => {
                    closeMenu()
                    signOut()
                    setSignedIn(false)
                    onLogout?.()
                  }}
                >
                  <MenuGlyph name="logout" />
                  Đăng xuất
                </button>
              ) : null}
            </div>
          </nav>
        </>
      ) : null}
    </header>
  )
}

export type TabItem = {
  id: string
  label: string
  short: string
  to: string
}

export function SectionTabs({ items, current, label }: { items: TabItem[]; current: string; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-card p-1 ring-1 ring-line">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          role="tab"
          aria-selected={item.id === current}
          className={`rounded-xl px-2 py-2.5 text-center text-xs font-semibold leading-tight sm:text-sm ${
            item.id === current ? 'bg-court text-white' : 'text-ink'
          }`}
        >
          <span className="sm:hidden">{item.short}</span>
          <span className="hidden sm:inline">{item.label}</span>
        </Link>
      ))}
    </div>
  )
}
