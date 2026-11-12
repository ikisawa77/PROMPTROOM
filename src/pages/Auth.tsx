import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wand2,
} from 'lucide-react'
import Artwork from '../components/Artwork'
import Illustration from '../components/Illustration'
import { useAuth } from '../lib/auth'

type Mode = 'login' | 'register'

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#111111" />
      <rect x="6" y="6" width="9" height="20" fill="#ff4a1c" />
      <rect x="18" y="6" width="8" height="8" fill="#f2efe7" />
      <rect x="18" y="17" width="8" height="9" fill="#d8ff4f" />
    </svg>
  )
}

export default function AuthPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from || '/'

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') {
        await register(name, email, password)
      } else {
        await login(email, password)
      }
      navigate(from, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-visual">
          <div className="auth-art" aria-hidden="true">
            <Artwork seed="auth-room" variant="bloom" swatch={['#101010', '#ff4a1c', '#d8ff4f']} />
          </div>
          <div className="auth-visual-top">
            <Link to="/" className="auth-brand">
              <BrandMark />
              <span>
                PROMPTROOM<sup>®</sup>
              </span>
            </Link>
            <span className="auth-badge">
              <Sparkles size={12} /> TH AI STUDIO
            </span>
          </div>

          <div className="auth-visual-copy">
            <span className="eyebrow eyebrow-light">
              <span className="eyebrow-line" />
              CREATIVE &amp; ART DIRECTION ENGINE
            </span>
            <h2>
              ห้องเครื่องพรอมป์
              <br />
              สำหรับ<span>ทีมครีเอทีฟ</span>
            </h2>
            <p>
              เก็บพรอมป์ แบรนด์ และทิศทางภาพไว้ในที่เดียว
              แล้วกลับมาแก้ต่อได้ทุกเครื่องเมื่อเข้าสู่ระบบ
            </p>

            <ul className="auth-points">
              <li>
                <Wand2 size={15} />
                <span>
                  <strong>สร้างพรอมป์พร้อมใช้</strong>
                  <em>master, routes, shot list, negative prompt</em>
                </span>
              </li>
              <li>
                <ShieldCheck size={15} />
                <span>
                  <strong>คลังส่วนตัวแยกตามบัญชี</strong>
                  <em>ข้อมูลของแต่ละคนไม่ปะปนกัน</em>
                </span>
              </li>
              <li>
                <Database size={15} />
                <span>
                  <strong>เก็บใน SQLite บนเซิร์ฟเวอร์คุณ</strong>
                  <em>ไม่ส่งข้อมูลออกนอกเว้นแต่เปิด AI Boost</em>
                </span>
              </li>
            </ul>
          </div>

          <Illustration scene="stack" className="auth-illustration" />
        </aside>

        <main className="auth-main">
          <div className="auth-form-wrap">
            <div className="auth-form-head">
              <span className="eyebrow">
                <span className="eyebrow-line" />
                {mode === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
              </span>
              <h1 className="auth-title">
                {mode === 'login' ? (
                  <>
                    เข้าสู่ระบบ
                    <br />
                    เพื่อ<span className="accent">เริ่มสร้าง</span>
                  </>
                ) : (
                  <>
                    สมัครสมาชิก
                    <br />
                    แล้ว<span className="accent">ใช้งานได้ทันที</span>
                  </>
                )}
              </h1>
              <p className="auth-sub">
                {mode === 'login'
                  ? 'ใช้บัญชีเดิมเพื่อเปิดคลังพรอมป์และ Brand Kit ของคุณ'
                  : 'สร้างบัญชีฟรี ระบบจะเตรียมพรอมป์ตัวอย่างและ Brand Kit ให้เริ่มต้น'}
              </p>
            </div>

            <div className="auth-tabs" role="tablist" aria-label="เลือกวิธีเข้าใช้งาน">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? 'is-active' : ''}
                onClick={() => switchMode('login')}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={mode === 'register' ? 'is-active' : ''}
                onClick={() => switchMode('register')}
              >
                สมัครสมาชิก
              </button>
            </div>

            <form className="auth-form" onSubmit={submit}>
              {mode === 'register' && (
                <label className="auth-field">
                  <span>ชื่อที่ใช้แสดง</span>
                  <span className="auth-input">
                    <UserRound size={16} />
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="เช่น นภา จากทีม Art Direction"
                      autoComplete="name"
                      minLength={2}
                      maxLength={80}
                      required
                    />
                  </span>
                </label>
              )}

              <label className="auth-field">
                <span>อีเมล</span>
                <span className="auth-input">
                  <Mail size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@studio.co"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label className="auth-field">
                <span>รหัสผ่าน</span>
                <span className="auth-input">
                  <LockKeyhole size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === 'register' ? 'อย่างน้อย 8 ตัวอักษร' : 'รหัสผ่านของคุณ'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </label>

              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-accent auth-submit" disabled={busy}>
                {busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
                {busy
                  ? 'กำลังดำเนินการ…'
                  : mode === 'login'
                    ? 'เข้าสู่ระบบ'
                    : 'สร้างบัญชีและเริ่มใช้งาน'}
              </button>

              <p className="auth-note">
                {mode === 'login' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'}{' '}
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? 'สมัครสมาชิกฟรี' : 'เข้าสู่ระบบ'}
                </button>
              </p>
            </form>

            <p className="auth-legal">
              การเข้าใช้งานถือว่ายอมรับนโยบายการใช้ข้อมูลภายในทีม ·
              ข้อมูลพรอมป์และแบรนด์ถูกเก็บในฐานข้อมูลของคุณเอง
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
