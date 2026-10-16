import { useEffect } from 'react'
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { SiteHeader } from './components/ui.tsx'
import { AdminPage } from './pages/AdminPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { TournamentPage } from './pages/TournamentPage.tsx'
import { StoreProvider } from './store/StoreProvider.tsx'

function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, search])
  return null
}

function PublicShell() {
  return (
    <div className="min-h-dvh bg-sand text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  )
}

function NotFound() {
  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-line">
      <h1 className="text-xl font-extrabold">Không tìm thấy trang</h1>
      <Link to="/" className="mt-3 inline-block font-semibold text-court">
        Về trang chủ
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<PublicShell />}>
            <Route path="/" element={<HomePage scope="today" />} />
            <Route path="/lich-su" element={<HomePage scope="history" />} />
            <Route path="/giai/:tournamentId" element={<TournamentPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/ban-to-chuc/dang-nhap" element={<LoginPage />} />
          <Route path="/ban-to-chuc" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
