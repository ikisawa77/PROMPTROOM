import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Command,
  Database,
  ExternalLink,
  Layers,
  LayoutGrid,
  Library as LibraryIcon,
  Menu,
  Palette,
  Search,
  Server,
  Wand2,
  X,
} from 'lucide-react'
import CommandPalette from './CommandPalette'
import Popover from './ui/Popover'
import WorkspaceSwitcher from './WorkspaceSwitcher'

const NAV = [
  { to: '/studio', label: 'Studio', icon: Wand2 },
  { to: '/templates', label: 'เทมเพลต', icon: Layers },
  { to: '/library', label: 'คลังพรอมป์', icon: LibraryIcon },
  { to: '/brands', label: 'แบรนด์', icon: Palette },
  { to: '/guide', label: 'คู่มือ', icon: BookOpen },
]

const TICKER = [
  'CREATIVE PROMPT ENGINE',
  'ART DIRECTION SYSTEM',
  'ภาษาไทย 100%',
  'MIDJOURNEY · FLUX · FIREFLY · RUNWAY',
  'BRIEF IN → SYSTEM OUT',
  'PROMPTROOM © 2026',
]

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#111111" />
      <rect x="6" y="6" width="9" height="20" fill="#ff4a1c" />
      <rect x="18" y="6" width="8" height="8" fill="#f2efe7" />
      <rect x="18" y="17" width="8" height="9" fill="#d8ff4f" />
    </svg>
  )
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const update = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight
      setProgress(height > 0 ? Math.min(1, window.scrollY / height) : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return (
    <div className="scroll-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="site">
      <a className="skip-link" href="#main-content">
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <ScrollProgress />

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div className="ticker-group" key={copy}>
              {TICKER.map((item) => (
                <span key={`${copy}-${item}`}>
                  {item}
                  <i className="ticker-dot" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="PROMPTROOM หน้าแรก">
            <Mark />
            <span className="brand-word">
              PROMPTROOM<sup>®</sup>
            </span>
            <span className="brand-th">TH</span>
          </Link>

          <nav className="nav-links" aria-label="เมนูหลัก">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav-actions">
            <button
              type="button"
              className="nav-search"
              onClick={() => setPaletteOpen(true)}
              aria-label="ค้นหาคำสั่ง"
              title="ค้นหาคำสั่ง (Ctrl K)"
            >
              <Search size={14} />
              <span>ค้นหา</span>
              <kbd>
                <Command size={9} />K
              </kbd>
            </button>

            <div className="nav-workspace">
              <WorkspaceSwitcher compact />
            </div>

            <Popover
              label="ข้อมูลระบบ"
              align="end"
              width={300}
              className="system-pop"
              trigger={(props) => (
                <button type="button" className="nav-icon-btn" aria-label="ข้อมูลระบบ" {...props}>
                  <Activity size={16} />
                </button>
              )}
            >
              {(close) => (
                <div className="system-panel">
                  <header className="pop-head">
                    <div>
                      <span className="pop-kicker">SYSTEM</span>
                      <h4>สถานะและเครื่องมือระบบ</h4>
                    </div>
                    <span className="live-chip">
                      <i /> LOCAL
                    </span>
                  </header>
                  <a className="system-link" href="/api/health" target="_blank" rel="noreferrer" onClick={close}>
                    <span className="system-icon">
                      <Server size={15} />
                    </span>
                    <span>
                      <strong>API Health</strong>
                      <em>ตรวจ /api/health แบบสด</em>
                    </span>
                    <ExternalLink size={13} />
                  </a>
                  <a className="system-link" href="http://localhost:9090" target="_blank" rel="noreferrer" onClick={close}>
                    <span className="system-icon">
                      <Activity size={15} />
                    </span>
                    <span>
                      <strong>Control Center</strong>
                      <em>start / stop / build บนเครื่องนี้</em>
                    </span>
                    <ExternalLink size={13} />
                  </a>
                  <Link className="system-link" to="/library" onClick={close}>
                    <span className="system-icon">
                      <Database size={15} />
                    </span>
                    <span>
                      <strong>คลังพรอมป์</strong>
                      <em>SQLite · data/promptroom.db</em>
                    </span>
                    <ArrowUpRight size={13} />
                  </Link>
                  <Link className="system-link" to="/guide" onClick={close}>
                    <span className="system-icon">
                      <BookOpen size={15} />
                    </span>
                    <span>
                      <strong>คู่มือการใช้งาน</strong>
                      <em>วิธีเขียนบรีฟให้ได้ผล</em>
                    </span>
                    <ArrowUpRight size={13} />
                  </Link>
                  <div className="system-note">
                    <span className="status-dot is-live" />
                    ข้อมูลทุกอย่างเก็บในเครื่องคุณ ไม่ส่งออกนอกเว้นแต่เปิด AI Boost
                  </div>
                </div>
              )}
            </Popover>

            <Link to="/studio" className="btn btn-dark btn-sm nav-cta">
              เปิด Studio
              <ArrowUpRight size={15} />
            </Link>
            <button
              type="button"
              className="menu-toggle"
              aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="mobile-menu">
            <div className="mobile-menu-top">
              <WorkspaceSwitcher />
              <button type="button" className="mobile-search" onClick={() => setPaletteOpen(true)}>
                <Search size={16} /> ค้นหาคำสั่งและหน้า
                <kbd>⌘K</kbd>
              </button>
            </div>
            {NAV.map((item, index) => (
              <NavLink key={item.to} to={item.to} className="mobile-link">
                <span className="mono-index">0{index + 1}</span>
                <item.icon size={18} strokeWidth={1.6} />
                {item.label}
                <ArrowUpRight size={18} />
              </NavLink>
            ))}
            <div className="mobile-menu-foot">
              <p>ห้องเครื่องพรอมป์สำหรับงานครีเอทีฟและอาร์ตไดเรกชัน</p>
              <a href="http://localhost:9090" target="_blank" rel="noreferrer" className="btn btn-dark">
                Control Center
                <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        )}
      </header>

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">
                PROMPTROOM<sup>®</sup>
              </div>
              <p className="footer-tag">
                ห้องเครื่องพรอมป์สำหรับงานครีเอทีฟ
                <br />
                แปลงบรีฟไทยให้เป็นภาพที่กำกับได้จริง
              </p>
              <Link to="/studio" className="btn btn-accent">
                เริ่มสร้างพรอมป์
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="footer-col">
              <h4>เครื่องมือ</h4>
              <Link to="/studio">Prompt Studio</Link>
              <Link to="/templates">เทมเพลตตั้งต้น</Link>
              <Link to="/library">คลังพรอมป์</Link>
              <Link to="/brands">Brand Kits</Link>
              <Link to="/guide">คู่มือการใช้งาน</Link>
            </div>

            <div className="footer-col">
              <h4>ระบบ</h4>
              <a href="/api/health" target="_blank" rel="noreferrer">
                API Health
              </a>
              <a href="http://localhost:9090" target="_blank" rel="noreferrer">
                Local Control Center
              </a>
              <a href="https://fonts.google.com/specimen/Prompt" target="_blank" rel="noreferrer">
                ฟอนต์ Prompt
              </a>
              <span className="footer-note">เก็บข้อมูลใน SQLite บนเครื่องคุณ</span>
            </div>

            <div className="footer-col footer-col-wide">
              <h4>หมายเหตุ</h4>
              <p>
                เว็บนี้ทำงานแบบ fullstack: React frontend, Express API และ SQLite
                สำหรับทดสอบบนเครื่องก่อนขึ้นโฮสต์จริง ใช้ Control Center ดูแลเซิร์ฟเวอร์ได้ที่พอร์ต 9090
              </p>
              <p className="footer-note">© 2026 PROMPTROOM · ใช้ฟอนต์ Prompt ทั้งเว็บไซต์</p>
            </div>
          </div>

          <div className="footer-word" aria-hidden="true">
            PROMPTROOM
          </div>

          <div className="footer-bottom">
            <span>CREATIVE &amp; ART DIRECTION PROMPT ENGINE</span>
            <span>MADE FOR THAI CREATIVE TEAMS</span>
            <span>LOCALHOST EDITION · V1.0</span>
          </div>
        </div>
      </footer>

      <nav className="mobile-dock" aria-label="เมนูลัดมือถือ">
        <NavLink to="/studio" className="dock-item">
          <Wand2 size={18} />
          <span>Studio</span>
        </NavLink>
        <NavLink to="/templates" className="dock-item">
          <LayoutGrid size={18} />
          <span>เทมเพลต</span>
        </NavLink>
        <NavLink to="/library" className="dock-item">
          <LibraryIcon size={18} />
          <span>คลัง</span>
        </NavLink>
        <NavLink to="/brands" className="dock-item">
          <Palette size={18} />
          <span>แบรนด์</span>
        </NavLink>
        <button type="button" className="dock-item" onClick={() => setPaletteOpen(true)}>
          <Search size={18} />
          <span>ค้นหา</span>
        </button>
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
