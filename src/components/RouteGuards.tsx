import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Artwork from './Artwork'

function AuthSplash() {
  return (
    <div className="auth-splash" role="status" aria-live="polite">
      <div className="auth-splash-art" aria-hidden="true">
        <Artwork seed="auth-splash" variant="horizon" swatch={['#101010', '#ff4a1c', '#d8ff4f']} />
      </div>
      <div className="auth-splash-copy">
        <span className="route-fallback-mark" />
        <p>กำลังตรวจสอบสิทธิ์การใช้งาน…</p>
      </div>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSplash />
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <>{children}</>
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthSplash />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}
