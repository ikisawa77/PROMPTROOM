import { useEffect, useState } from 'react'
import { Check, Database, Layers, Plus, RefreshCw } from 'lucide-react'
import { getWorkspace, getWorkspaceList, normalizeWorkspaceName, setWorkspace } from '../lib/api'
import Popover from './ui/Popover'

export default function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const [current, setCurrent] = useState(getWorkspace)
  const [list, setList] = useState(getWorkspaceList)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('promptroom:open-workspace', onOpen)
    return () => window.removeEventListener('promptroom:open-workspace', onOpen)
  }, [])

  const apply = (name: string) => {
    const normalized = normalizeWorkspaceName(name)
    if (!normalized) {
      setError('ใช้ตัวอักษร a-z, 0-9 และขีดกลางเท่านั้น')
      return
    }
    if (!setWorkspace(normalized)) {
      setError('ตั้งชื่อ workspace ไม่สำเร็จ')
      return
    }
    setCurrent(normalized)
    setList(getWorkspaceList())
    setDraft('')
    setError('')
    window.setTimeout(() => window.location.reload(), 120)
  }

  return (
    <Popover
      label="สลับ workspace"
      align="end"
      width={336}
      className="workspace-pop"
      open={open}
      onOpenChange={setOpen}
      trigger={(props) => (
        <button type="button" className={`workspace-trigger${compact ? ' is-compact' : ''}`} {...props}>
          <span className="workspace-avatar">{current.slice(0, 2).toUpperCase()}</span>
          {!compact && (
            <span className="workspace-copy">
              <em>WORKSPACE</em>
              <strong>{current}</strong>
            </span>
          )}
          <Layers size={14} className="workspace-caret" />
        </button>
      )}
    >
      {(close) => (
        <div className="workspace-panel">
          <header className="pop-head">
            <div>
              <span className="pop-kicker">WORKSPACE</span>
              <h4>แยกคลังพรอมป์ตามทีม</h4>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setList(getWorkspaceList())
              }}
              aria-label="รีเฟรชรายการ"
            >
              <RefreshCw size={13} />
            </button>
          </header>

          <p className="pop-note">
            พรอมป์และ Brand Kit จะถูกเก็บแยกตามชื่อ workspace — เหมาะกับการแยกงานลูกค้าแต่ละราย
          </p>

          <div className="workspace-list" role="listbox" aria-label="workspace ที่มีอยู่">
            {list.map((name) => (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={name === current}
                className={`workspace-item${name === current ? ' is-active' : ''}`}
                onClick={() => {
                  if (name === current) {
                    close()
                    return
                  }
                  apply(name)
                }}
              >
                <span className="workspace-avatar small">{name.slice(0, 2).toUpperCase()}</span>
                <span>
                  <strong>{name}</strong>
                  <em>{name === current ? 'กำลังใช้งาน' : 'สลับไป workspace นี้'}</em>
                </span>
                {name === current && <Check size={14} />}
              </button>
            ))}
          </div>

          <form
            className="workspace-new"
            onSubmit={(event) => {
              event.preventDefault()
              apply(draft)
            }}
          >
            <label className="pop-kicker" htmlFor="workspace-new-input">
              เปิด workspace ใหม่
            </label>
            <div className="workspace-new-row">
              <input
                id="workspace-new-input"
                className="input"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setError('')
                }}
                placeholder="เช่น client-north"
                maxLength={40}
              />
              <button type="submit" className="btn btn-dark btn-sm" disabled={!draft.trim()}>
                <Plus size={14} />
                เปิด
              </button>
            </div>
            {error && <p className="field-error">{error}</p>}
          </form>

          <footer className="pop-foot">
            <Database size={12} />
            <span>
              เก็บใน SQLite · แยกข้อมูลด้วย header <code>x-workspace</code>
            </span>
          </footer>
        </div>
      )}
    </Popover>
  )
}
