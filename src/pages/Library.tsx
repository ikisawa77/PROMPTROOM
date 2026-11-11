import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import type { PromptListItem, SavedPrompt } from '../../shared/types'
import { STYLES, TASKS } from '../../shared/options'
import { api, STUDIO_STORAGE_KEY } from '../lib/api'
import { copyLink, copyText, downloadText, formatDate, resultToMarkdown, slugify } from '../lib/utils'
import ArtTile from '../components/ArtTile'
import ResultView from '../components/ResultView'
import { useToast } from '../components/Toast'
import Modal from '../components/ui/Modal'
import Popover from '../components/ui/Popover'
import ToolIcon from '../components/ToolIcon'

type SortMode = 'newest' | 'oldest' | 'title'

export default function Library() {
  const { show } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<PromptListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [task, setTask] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [sort, setSort] = useState<SortMode>('newest')
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem('promptroom.library.view') === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })
  const [openId, setOpenId] = useState('')
  const [detail, setDetail] = useState<SavedPrompt | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    setLoadError('')
    api
      .prompts({ q: query, task: task || undefined, favorite })
      .then((data) => setItems(data.prompts))
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'โหลดคลังไม่สำเร็จ')
        show(error instanceof Error ? error.message : 'โหลดคลังไม่สำเร็จ', 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, task, favorite])

  useEffect(() => {
    try {
      localStorage.setItem('promptroom.library.view', view)
    } catch {
      /* ignore */
    }
  }, [view])

  useEffect(() => {
    const deepLink = params.get('prompt')
    if (deepLink && !openId) setOpenId(deepLink)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!openId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    api
      .prompt(openId)
      .then((data) => {
        setDetail(data.prompt)
        setTitleDraft(data.prompt.title)
      })
      .catch((error) => {
        show(error instanceof Error ? error.message : 'โหลดพรอมป์ไม่สำเร็จ', 'error')
        setOpenId('')
      })
      .finally(() => setDetailLoading(false))
  }, [openId, show])

  const closeDetail = () => {
    setOpenId('')
    setRenaming(false)
    if (params.get('prompt')) {
      const next = new URLSearchParams(params)
      next.delete('prompt')
      setParams(next, { replace: true })
    }
  }

  const toggleFavorite = async (item: PromptListItem) => {
    try {
      const response = await api.patchPrompt(item.id, { favorite: !item.favorite })
      setItems((previous) =>
        previous.map((entry) =>
          entry.id === item.id ? { ...entry, favorite: response.prompt.favorite } : entry,
        ),
      )
      if (detail?.id === item.id) setDetail({ ...detail, favorite: response.prompt.favorite })
      show(response.prompt.favorite ? 'เพิ่มในรายการโปรดแล้ว' : 'นำออกจากรายการโปรดแล้ว', 'success')
    } catch (error) {
      show(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ', 'error')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('ลบพรอมป์นี้ออกจากคลังถาวร?')) return
    try {
      await api.deletePrompt(id)
      setItems((previous) => previous.filter((item) => item.id !== id))
      if (openId === id) closeDetail()
      show('ลบพรอมป์แล้ว', 'success')
    } catch (error) {
      show(error instanceof Error ? error.message : 'ลบไม่สำเร็จ', 'error')
    }
  }

  const duplicate = async (id: string) => {
    try {
      await api.duplicatePrompt(id)
      show('ทำสำเนาแล้ว', 'success')
      load()
    } catch (error) {
      show(error instanceof Error ? error.message : 'ทำสำเนาไม่สำเร็จ', 'error')
    }
  }

  const openInStudio = (prompt: SavedPrompt) => {
    try {
      localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(prompt.input))
    } catch {
      /* ignore */
    }
    navigate('/studio')
  }

  const saveTitle = async () => {
    if (!detail || !titleDraft.trim()) return
    try {
      const response = await api.patchPrompt(detail.id, { title: titleDraft.trim() })
      setDetail(response.prompt)
      setItems((previous) =>
        previous.map((item) => (item.id === detail.id ? { ...item, title: response.prompt.title } : item)),
      )
      setRenaming(false)
      show('เปลี่ยนชื่อพรอมป์แล้ว', 'success')
    } catch (error) {
      show(error instanceof Error ? error.message : 'เปลี่ยนชื่อไม่สำเร็จ', 'error')
    }
  }

  const share = async (id: string) => {
    const ok = await copyLink(`/library?prompt=${id}`)
    show(ok ? 'คัดลอกลิงก์แชร์แล้ว' : 'คัดลอกลิงก์ไม่สำเร็จ', ok ? 'success' : 'error')
  }

  const copyPrompt = async (id: string) => {
    try {
      const data = await api.prompt(id)
      const ok = await copyText(data.prompt.result.toolPrompt)
      show(ok ? 'คัดลอกพรอมป์แล้ว' : 'คัดลอกไม่สำเร็จ', ok ? 'success' : 'error')
    } catch {
      show('โหลดพรอมป์ไม่สำเร็จ', 'error')
    }
  }

  const downloadPrompt = async (id: string) => {
    try {
      const data = await api.prompt(id)
      downloadText(`promptroom-${slugify(data.prompt.result.title)}.md`, resultToMarkdown(data.prompt.result))
      show('ดาวน์โหลด .md แล้ว', 'success')
    } catch {
      show('ดาวน์โหลดไม่สำเร็จ', 'error')
    }
  }

  const sorted = useMemo(() => {
    const list = [...items]
    if (sort === 'oldest') list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    if (sort === 'newest') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'th'))
    return list
  }, [items, sort])

  const countLabel = useMemo(() => {
    if (loading) return 'กำลังโหลด…'
    return `${items.length} รายการ`
  }, [items.length, loading])

  const styleSwatch = (styleId: string) =>
    STYLES.find((style) => style.id === styleId)?.swatch ?? ['#e8ded2', '#8c3b2e', '#2f2a26']

  const openIndex = sorted.findIndex((item) => item.id === openId)
  const goDetail = (offset: number) => {
    if (openIndex < 0) return
    const next = sorted[(openIndex + offset + sorted.length) % sorted.length]
    if (next) setOpenId(next.id)
  }

  useEffect(() => {
    if (!openId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetail()
      if (event.key === 'ArrowRight' && !renaming) goDetail(1)
      if (event.key === 'ArrowLeft' && !renaming) goDetail(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, openIndex, renaming, sorted])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="page library-page">
      <div className="container">
        <div className="page-head">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              LIBRARY / SAVED PROMPTS
            </div>
            <h1 className="page-title">
              คลังพรอมป์
              <br />
              ของ<span className="accent">ทีมคุณ</span>
            </h1>
            <p className="page-desc">
              ทุกพรอมป์ที่สร้างถูกเก็บพร้อมเวอร์ชัน ค้นหา ดาวน์โหลด หรือเปิดกลับไปแก้ต่อได้ทันที
              ข้อมูลอยู่ใน SQLite บนเครื่องนี้
            </p>
          </div>
          <div className="page-head-actions">
            <span className="count-pill">{countLabel}</span>
            <button type="button" className="btn btn-dark" onClick={() => navigate('/studio')}>
              <Plus size={16} />
              สร้างพรอมป์ใหม่
            </button>
          </div>
        </div>

        <div className="library-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อ บรีฟ หรือสไตล์…"
              aria-label="ค้นหาพรอมป์"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="ล้างคำค้น">
                <X size={14} />
              </button>
            ) : (
              <kbd className="search-kbd">/</kbd>
            )}
          </label>

          <select
            className="input select toolbar-select"
            value={task}
            onChange={(event) => setTask(event.target.value)}
            aria-label="กรองตามประเภทงาน"
          >
            <option value="">ทุกประเภทงาน</option>
            {TASKS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.th}
              </option>
            ))}
          </select>

          <select
            className="input select toolbar-select sort-select"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            aria-label="เรียงลำดับ"
          >
            <option value="newest">ใหม่ที่สุด</option>
            <option value="oldest">เก่าที่สุด</option>
            <option value="title">ชื่อ ก–ฮ</option>
          </select>

          <button
            type="button"
            className={`filter-btn${favorite ? ' is-active' : ''}`}
            onClick={() => setFavorite((value) => !value)}
            aria-pressed={favorite}
          >
            <Star size={15} fill={favorite ? 'currentColor' : 'none'} />
            รายการโปรด
          </button>

          <div className="view-toggle" role="group" aria-label="มุมมอง">
            <button
              type="button"
              className={view === 'grid' ? 'is-active' : ''}
              onClick={() => setView('grid')}
              aria-label="มุมมองการ์ด"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={view === 'list' ? 'is-active' : ''}
              onClick={() => setView('list')}
              aria-label="มุมมองรายการ"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton-grid">
            {[0, 1, 2, 3].map((index) => (
              <div className="skeleton-card" key={index}>
                <div className="skeleton-art" />
                <div className="skeleton-line wide" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="empty-state is-error">
            <div className="empty-mark">!</div>
            <h2>โหลดคลังไม่สำเร็จ</h2>
            <p>{loadError} — ตรวจว่าเซิร์ฟเวอร์ทำงานอยู่ แล้วลองอีกครั้ง</p>
            <button type="button" className="btn btn-dark" onClick={load}>
              <RotateCw size={15} /> ลองอีกครั้ง
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-mark">{query || task || favorite ? '∅' : '◇'}</div>
            <h2>{query || task || favorite ? 'ไม่พบพรอมป์ในเงื่อนไขนี้' : 'ยังไม่มีพรอมป์ในคลัง'}</h2>
            <p>
              {query || task || favorite
                ? 'ลองล้างตัวกรองหรือใช้คำค้นที่สั้นลง'
                : 'เริ่มสร้างพรอมป์แรกจาก Studio แล้วระบบจะบันทึกเข้าคลังให้อัตโนมัติ'}
            </p>
            <div className="empty-actions">
              {(query || task || favorite) && (
                <button
                  type="button"
                  className="btn btn-line"
                  onClick={() => {
                    setQuery('')
                    setTask('')
                    setFavorite(false)
                  }}
                >
                  ล้างตัวกรอง
                </button>
              )}
              <button type="button" className="btn btn-dark" onClick={() => navigate('/studio')}>
                เปิด Studio <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className={`library-grid${view === 'list' ? ' is-list' : ''}`}>
            {sorted.map((item) => (
              <article className="library-card" key={item.id}>
                <button
                  type="button"
                  className="library-art-btn"
                  onClick={() => setOpenId(item.id)}
                  aria-label={`เปิด ${item.title}`}
                >
                  <ArtTile
                    swatch={styleSwatch(item.style)}
                    ratio={view === 'list' ? 'square' : 'wide'}
                    index={TASKS.find((entry) => entry.id === item.task)?.th}
                    seed={item.id}
                    className="library-art"
                  />
                </button>
                <div className="library-card-body">
                  <div className="library-card-top">
                    <span className="template-tag with-icon">
                      <ToolIcon id={item.tool} size={16} />
                      {item.toolName}
                    </span>
                    <div className="library-card-tools">
                      <button
                        type="button"
                        className={`star-btn${item.favorite ? ' is-active' : ''}`}
                        onClick={() => toggleFavorite(item)}
                        aria-label={item.favorite ? 'นำออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
                      >
                        <Star size={16} fill={item.favorite ? 'currentColor' : 'none'} />
                      </button>
                      <Popover
                        label={`ตัวเลือก ${item.title}`}
                        align="end"
                        width={220}
                        trigger={(props) => (
                          <button type="button" className="icon-btn kebab-btn" aria-label="ตัวเลือกเพิ่มเติม" {...props}>
                            <span className="kebab" />
                          </button>
                        )}
                      >
                        {(close) => (
                          <div className="action-menu">
                            <button
                              type="button"
                              onClick={() => {
                                close()
                                setOpenId(item.id)
                              }}
                            >
                              <ArrowUpRight size={14} /> เปิดรายละเอียด
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                close()
                                void copyPrompt(item.id)
                              }}
                            >
                              <Copy size={14} /> คัดลอกพรอมป์
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                close()
                                void downloadPrompt(item.id)
                              }}
                            >
                              <Download size={14} /> ดาวน์โหลด .md
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                close()
                                void duplicate(item.id)
                              }}
                            >
                              <Plus size={14} /> ทำสำเนา
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                close()
                                void share(item.id)
                              }}
                            >
                              <ArrowUpRight size={14} /> คัดลอกลิงก์แชร์
                            </button>
                            <div className="action-sep" />
                            <button
                              type="button"
                              className="danger"
                              onClick={() => {
                                close()
                                void remove(item.id)
                              }}
                            >
                              <Trash2 size={14} /> ลบพรอมป์
                            </button>
                          </div>
                        )}
                      </Popover>
                    </div>
                  </div>
                  <button type="button" className="library-title" onClick={() => setOpenId(item.id)}>
                    {item.title}
                  </button>
                  <p className="library-brief">{item.brief}</p>
                  <div className="library-foot">
                    <span>{formatDate(item.createdAt)}</span>
                    <div className="library-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="คัดลอกพรอมป์"
                        onClick={() => copyPrompt(item.id)}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="คัดลอกลิงก์แชร์"
                        onClick={() => share(item.id)}
                      >
                        <ArrowUpRight size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label="ลบพรอมป์"
                        onClick={() => remove(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(openId)}
        onClose={closeDetail}
        kicker={detail ? `${detail.tool.toUpperCase()} · PROMPT DETAIL` : 'PROMPT DETAIL'}
        title={detail?.title ?? 'กำลังโหลด…'}
        size="wide"
        tone="dark"
        className="library-modal"
        actions={
          detail ? (
            <>
              <button
                type="button"
                className={`icon-btn${detail.favorite ? ' is-active' : ''}`}
                aria-label="รายการโปรด"
                onClick={() => toggleFavorite(detail as unknown as PromptListItem)}
              >
                <Star size={15} fill={detail.favorite ? 'currentColor' : 'none'} />
              </button>
              <button type="button" className="icon-btn" aria-label="เปลี่ยนชื่อ" onClick={() => setRenaming(true)}>
                <Pencil size={14} />
              </button>
              <button type="button" className="btn btn-line btn-sm" onClick={() => duplicate(detail.id)}>
                ทำสำเนา
              </button>
              <button type="button" className="btn btn-dark btn-sm" onClick={() => openInStudio(detail)}>
                เปิดใน Studio <ArrowUpRight size={14} />
              </button>
            </>
          ) : undefined
        }
      >
        {renaming && detail && (
          <div className="rename-row">
            <input
              className="input"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveTitle()
                if (event.key === 'Escape') setRenaming(false)
              }}
              autoFocus
              aria-label="ชื่อพรอมป์ใหม่"
            />
            <button type="button" className="btn btn-dark btn-sm" onClick={saveTitle}>
              <Check size={14} /> บันทึก
            </button>
            <button type="button" className="btn btn-line btn-sm" onClick={() => setRenaming(false)}>
              ยกเลิก
            </button>
          </div>
        )}

        {detailLoading || !detail ? (
          <div className="loading-state dark">
            <Loader2 size={20} className="spin" />
            กำลังโหลดรายละเอียด…
          </div>
        ) : (
          <>
            <ResultView
              result={detail.result}
              variant="modal"
              savedId={detail.id}
              onShare={() => share(detail.id)}
            />
            <div className="detail-nav">
              <button type="button" className="btn btn-line btn-sm" onClick={() => goDetail(-1)}>
                <ArrowLeft size={14} /> ก่อนหน้า
              </button>
              <span>
                {openIndex + 1} / {sorted.length}
              </span>
              <button type="button" className="btn btn-line btn-sm" onClick={() => goDetail(1)}>
                ถัดไป <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
