import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { RedirectIfAuthed, RequireAuth } from './components/RouteGuards'
import Home from './pages/Home'
import Studio from './pages/Studio'
import Library from './pages/Library'
import Brands from './pages/Brands'
import AuthPage from './pages/Auth'
import NotFound from './pages/NotFound'

const Templates = lazy(() => import('./pages/Templates'))
const Guide = lazy(() => import('./pages/Guide'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function PageFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="route-fallback-mark" />
      <p>กำลังโหลดหน้านี้…</p>
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route
            path="/auth"
            element={
              <RedirectIfAuthed>
                <AuthPage />
              </RedirectIfAuthed>
            }
          />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route
              path="/studio"
              element={
                <RequireAuth>
                  <Studio />
                </RequireAuth>
              }
            />
            <Route
              path="/templates"
              element={
                <RequireAuth>
                  <Templates />
                </RequireAuth>
              }
            />
            <Route
              path="/library"
              element={
                <RequireAuth>
                  <Library />
                </RequireAuth>
              }
            />
            <Route
              path="/brands"
              element={
                <RequireAuth>
                  <Brands />
                </RequireAuth>
              }
            />
            <Route
              path="/guide"
              element={
                <RequireAuth>
                  <Guide />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
