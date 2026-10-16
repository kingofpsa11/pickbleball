import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { SiteHeader, fieldClass } from '../components/ui.tsx'
import { DEMO_ACCOUNT, organizerSignedIn, signIn } from '../lib/auth.ts'

function nextPath(value: string | null) {
  if (!value || !value.startsWith('/ban-to-chuc')) return '/ban-to-chuc?viec=lich-su'
  return value
}

export function LoginPage() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const destination = nextPath(search.get('next'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Đăng nhập ban tổ chức · Pickleball Thuỷ Lợi'
  }, [])

  if (organizerSignedIn()) return <Navigate to={destination} replace />

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (signIn(username, password)) {
      navigate(destination, { replace: true })
      return
    }
    setError('Sai tài khoản hoặc mật khẩu mẫu.')
  }

  return (
    <div className="min-h-dvh bg-sand">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-2xl font-extrabold">Cổng ban tổ chức</h1>
        <p className="mt-2 text-sm text-muted">
          Ban tổ chức đăng nhập để nhập tên thành viên nội bộ và tỷ số. Chưa có máy chủ đăng nhập thật.
        </p>
        <aside className="mt-4 rounded-3xl bg-ball/70 p-4 text-sm">
          <p className="font-extrabold">Tài khoản mẫu</p>
          <p className="mt-1">Tên đăng nhập: {DEMO_ACCOUNT.username}</p>
          <p>Mật khẩu: {DEMO_ACCOUNT.password}</p>
          <button
            type="button"
            className="mt-3 rounded-full bg-court px-3 py-2 text-sm font-bold text-white"
            onClick={() => {
              setUsername(DEMO_ACCOUNT.username)
              setPassword(DEMO_ACCOUNT.password)
              setError('')
            }}
          >
            Điền tài khoản mẫu
          </button>
        </aside>
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-3xl bg-card p-4 ring-1 ring-line">
          <label className="block text-sm font-semibold">
            Tên đăng nhập
            <input
              className={`${fieldClass} mt-1`}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Mật khẩu
            <input
              type="password"
              className={`${fieldClass} mt-1`}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="text-sm font-semibold text-live">{error}</p> : null}
          <button type="submit" className="w-full rounded-2xl bg-court py-3 font-bold text-white">
            Vào trang quản lý
          </button>
        </form>
      </main>
    </div>
  )
}
