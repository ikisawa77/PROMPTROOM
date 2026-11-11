import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  FileText,
  Home as HomeIcon,
  Layers,
  Library as LibraryIcon,
  Palette,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { TEMPLATES } from '../../shared/templates'
import { TOOLS } from '../../shared/options'
import { STUDIO_STORAGE_KEY } from '../lib/api'
import { useToast } from './Toast'
import ToolIcon from './ToolIcon'

interface Item {
  id: string
  group: string
  label: string
  hint?: string
  icon: React.ReactNode
  run: () => void
  keywords?: string
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { show } = useToast()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo<Item[]>(() => {
    const go = (path: string) => () => {
      onClose()
      navigate(path)
    }
    const base: Item[] = [
      { id: 'nav-home', group: 'หน้า', label: 'หน้าแรก', hint: '/', icon: <HomeIcon size={16} />, run: go('/') },
      { id: 'nav-studio', group: 'หน้า', label: 'Prompt Studio', hint: 'สร้างพรอมป์', icon: <Wand2 size={16} />, run: go('/studio') },
      { id: 'nav-templates', group: 'หน้า', label: 'เทมเพลตตั้งต้น', icon: <Layers size={16} />, run: go('/templates') },
      { id: 'nav-library', group: 'หน้า', label: 'คลังพรอมป์', icon: <LibraryIcon size={16} />, run: go('/library') },
      { id: 'nav-brands', group: 'หน้า', label: 'Brand Kits', icon: <Palette size={16} />, run: go('/brands') },
      { id: 'nav-guide', group: 'หน้า', label: 'คู่มือการใช้งาน', icon: <BookOpen size={16} />, run: go('/guide') },
      {
        id: 'act-new',
        group: 'คำสั่ง',
        label: 'เริ่มพรอมป์ใหม่จากศูนย์',
        hint: 'ล้าง draft ปัจจุบัน',
        icon: <Sparkles size={16} />,
        keywords: 'new reset draft ล้าง',
        run: () => {
          try {
            localStorage.removeItem(STUDIO_STORAGE_KEY)
          } catch {
            /* ignore */
          }
          onClose()
          navigate('/studio')
          show('เริ่ม draft ใหม่แล้ว', 'success')
        },
      },
      {
        id: 'act-control',
        group: 'คำสั่ง',
        label: 'เปิด Local Control Center',
        hint: 'localhost:9090',
        icon: <ExternalLink size={16} />,
        run: () => {
          onClose()
          window.open('http://localhost:9090', '_blank', 'noreferrer')
        },
      },
      {
        id: 'act-health',
        group: 'คำสั่ง',
        label: 'ตรวจ API Health',
        hint: '/api/health',
        icon: <FileText size={16} />,
        run: () => {
          onClose()
          window.open('/api/health', '_blank', 'noreferrer')
        },
      },
      {
        id: 'act-clear-workspace',
        group: 'คำสั่ง',
        label: 'เปิด workspace switcher',
        hint: 'แยกคลังตามทีม',
        icon: <Layers size={16} />,
        keywords: 'workspace team ทีม',
        run: () => {
          onClose()
          window.dispatchEvent(new CustomEvent('promptroom:open-workspace'))
        },
      },
      ...TEMPLATES.map<Item>((template) => ({
        id: `template-${template.id}`,
        group: 'เทมเพลต',
        label: template.title,
        hint: template.tag,
        icon: <Layers size={16} />,
        keywords: `${template.description} ${template.tag}`,
        run: go(`/studio?template=${template.id}`),
      })),
      ...TOOLS.slice(0, 6).map<Item>((tool) => ({
        id: `tool-${tool.id}`,
        group: 'เครื่องมือ',
        label: `ใช้ ${tool.name} ใน Studio`,
        hint: tool.best,
        icon: <ToolIcon id={tool.id} size={18} />,
        keywords: `${tool.note} ${tool.best}`,
        run: go('/studio'),
      })),
      {
        id: 'danger-reset',
        group: 'คำสั่ง',
        label: 'ล้าง draft ใน Studio',
        hint: 'ลบข้อมูลที่จำไว้ในเบราว์เซอร์',
        icon: <Trash2 size={16} />,
        run: () => {
          try {
            localStorage.removeItem(STUDIO_STORAGE_KEY)
          } catch {
            /* ignore */
          }
          onClose()
          show('ล้าง draft แล้ว', 'success')
        },
      },
    ]
    return base
  }, [navigate, onClose, show])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) =>
      `${item.label} ${item.hint ?? ''} ${item.keywords ?? ''} ${item.group}`.toLowerCase().includes(needle),
    )
  }, [items, query])

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>()
    filtered.forEach((item) => {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    })
    return Array.from(map.entries())
  }, [filtered])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((value) => Math.min(value + 1, filtered.length - 1))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((value) => Math.max(value - 1, 0))
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        filtered[active]?.run()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, filtered, active, onClose])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('.command-item.is-active')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  let index = -1

  return createPortal(
    <div className="command-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="command-panel" role="dialog" aria-modal="true" aria-label="ค้นหาคำสั่งและหน้า">
        <div className="command-input-row">
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาหน้า เทมเพลต หรือคำสั่ง…"
            aria-label="ค้นหาคำสั่ง"
          />
          <kbd>ESC</kbd>
        </div>

        <div className="command-list" ref={listRef}>
          {filtered.length === 0 && (
            <div className="command-empty">
              <Search size={22} />
              <p>ไม่พบผลลัพธ์สำหรับ “{query}”</p>
              <span>ลองพิมพ์ชื่อหน้า เทมเพลต หรือคำว่า export, workspace, ภาษาไทย</span>
            </div>
          )}

          {groups.map(([group, list]) => (
            <div className="command-group" key={group}>
              <span className="command-group-label">{group}</span>
              {list.map((item) => {
                index += 1
                const isActive = index === active
                const currentIndex = index
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`command-item${isActive ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(currentIndex)}
                    onClick={item.run}
                  >
                    <span className="command-icon">{item.icon}</span>
                    <span className="command-copy">
                      <strong>{item.label}</strong>
                      {item.hint && <em>{item.hint}</em>}
                    </span>
                    <ArrowRight size={14} className="command-go" />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <footer className="command-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> เลื่อน
          </span>
          <span>
            <kbd>↵</kbd> เปิด
          </span>
          <span>
            <kbd>⌘</kbd>
            <kbd>K</kbd> เปิดทุกที่
          </span>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
