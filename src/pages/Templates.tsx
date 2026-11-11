import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Copy,
  Eye,
  Search,
  Sparkles,
  Star,
  Wand2,
  X,
} from 'lucide-react'
import type { PromptInput, Template } from '../../shared/types'
import { TEMPLATES as LOCAL_TEMPLATES } from '../../shared/templates'
import { DEFAULT_INPUT, STYLES, TOOLS, findTask, LIGHTINGS, PALETTES } from '../../shared/options'
import { generatePrompt } from '../../shared/engine'
import { api, STUDIO_STORAGE_KEY } from '../lib/api'
import { copyText } from '../lib/utils'
import ArtTile from '../components/ArtTile'
import { useToast } from '../components/Toast'
import Modal from '../components/ui/Modal'
import ToolIcon from '../components/ToolIcon'

export default function Templates() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [templates, setTemplates] = useState<Template[]>(LOCAL_TEMPLATES)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('ทั้งหมด')
  const [preview, setPreview] = useState<Template | null>(null)

  useEffect(() => {
    api
      .templates()
      .then((data) => {
        if (data.templates.length) setTemplates(data.templates)
      })
      .catch(() => setTemplates(LOCAL_TEMPLATES))
  }, [])

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    templates.forEach((item) => counts.set(item.tag, (counts.get(item.tag) ?? 0) + 1))
    return [
      { label: 'ทั้งหมด', count: templates.length },
      ...Array.from(counts.entries()).map(([label, count]) => ({ label, count })),
    ]
  }, [templates])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return templates.filter((template) => {
      const matchesTag = tag === 'ทั้งหมด' || template.tag === tag
      const matchesQuery =
        !q ||
        template.title.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        (template.input.brief ?? '').toLowerCase().includes(q) ||
        template.tag.toLowerCase().includes(q)
      return matchesTag && matchesQuery
    })
  }, [templates, tag, query])

  const useTemplate = (template: Template) => {
    try {
      const stored = localStorage.getItem(STUDIO_STORAGE_KEY)
      const base = stored ? (JSON.parse(stored) as Record<string, unknown>) : {}
      localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ ...base, ...template.input }))
    } catch {
      /* ignore */
    }
    show(`โหลดเทมเพลต “${template.title}” แล้ว`, 'success')
    navigate(`/studio?template=${template.id}`)
  }

  const previewResult = useMemo(() => {
    if (!preview) return null
    const input = { ...DEFAULT_INPUT, ...preview.input } as PromptInput
    return generatePrompt(input)
  }, [preview])

  const hasFilter = Boolean(query || tag !== 'ทั้งหมด')

  return (
    <div className="page templates-page">
      <div className="container">
        <div className="page-head">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              TEMPLATES / STARTING POINTS
            </div>
            <h1 className="page-title">
              เริ่มจากงานจริง
              <br />
              ไม่ใช่<span className="accent">หน้าว่าง</span>
            </h1>
            <p className="page-desc">
              เทมเพลตที่ออกแบบจากโจทย์เอเจนซีและทีมแบรนด์ ใช้เป็นจุดตั้งต้นแล้วปรับให้เข้ากับแบรนด์คุณ
              ทุกใบมีบรีฟ ทิศทางภาพ และเครื่องมือที่เหมาะสมพร้อมแล้ว
            </p>
          </div>
          <div className="page-head-actions">
            <span className="count-pill">{filtered.length} เทมเพลต</span>
            <button type="button" className="btn btn-dark" onClick={() => navigate('/studio')}>
              เริ่มจากศูนย์ <ArrowUpRight size={15} />
            </button>
          </div>
        </div>

        <div className="library-toolbar templates-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาเทมเพลต เช่น คาเฟ่, วิดีโอ, โปสเตอร์…"
              aria-label="ค้นหาเทมเพลต"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="ล้างคำค้น">
                <X size={14} />
              </button>
            )}
          </label>
          <div className="tag-filter">
            {tags.map((item) => (
              <button
                type="button"
                key={item.label}
                className={`chip${tag === item.label ? ' is-active' : ''}`}
                onClick={() => setTag(item.label)}
              >
                {item.label}
                <em>{item.count}</em>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-mark">∅</div>
            <h2>ไม่พบเทมเพลตที่ตรงกับคำค้น</h2>
            <p>ลองใช้คำสั้นลง หรือเลือกหมวดอื่นจากตัวกรองด้านบน</p>
            {hasFilter && (
              <button
                type="button"
                className="btn btn-line"
                onClick={() => {
                  setQuery('')
                  setTag('ทั้งหมด')
                }}
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        ) : (
          <div className="template-grid templates-grid">
            {filtered.map((template, index) => {
              const task = template.input.task ? findTask(template.input.task) : null
              const style = STYLES.find((item) => item.id === template.input.style)
              const tool = TOOLS.find((item) => item.id === template.input.tool)
              const lighting = LIGHTINGS.find((item) => item.id === template.input.lighting)
              return (
                <article className="template-card template-card-lg" key={template.id}>
                  <div className="template-art-wrap">
                    <ArtTile
                      swatch={template.swatch}
                      ratio="portrait"
                      index={`N° ${String(index + 1).padStart(2, '0')}`}
                      label={template.tag}
                      seed={template.id}
                      className="template-art-lg"
                    />
                    <button
                      type="button"
                      className="art-preview-btn"
                      onClick={() => setPreview(template)}
                    >
                      <Eye size={14} /> ดูตัวอย่างพรอมป์
                    </button>
                    {template.featured && (
                      <span className="featured-badge">
                        <Star size={11} fill="currentColor" /> FEATURED
                      </span>
                    )}
                  </div>
                  <div className="template-body">
                    <div className="template-meta-row">
                      <span className="template-tag">{template.tag}</span>
                      {task && <span className="template-meta">{task.th}</span>}
                      {template.input.aspect && <span className="template-meta">{template.input.aspect}</span>}
                    </div>
                    <h3>{template.title}</h3>
                    <p>{template.description}</p>
                    <div className="template-config">
                      {style && <span>{style.th}</span>}
                      {lighting && <span>{lighting.th}</span>}
                      {tool && (
                        <span className="template-config-tool">
                          <ToolIcon id={tool.id} size={16} />
                          {tool.name}
                        </span>
                      )}
                      {template.input.seriesCount && <span>{template.input.seriesCount} ภาพ/ช็อต</span>}
                    </div>
                    <div className="template-actions">
                      <button type="button" className="template-cta" onClick={() => setPreview(template)}>
                        ดูรายละเอียด <Eye size={14} />
                      </button>
                      <button type="button" className="template-use" onClick={() => useTemplate(template)}>
                        ใช้เทมเพลต <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <div className="templates-note">
          <span className="eyebrow">
            <span className="eyebrow-line" />
            หมายเหตุ
          </span>
          <p>
            เทมเพลตทั้งหมดเป็นจุดตั้งต้น ไม่ใช่คำตอบสำเร็จรูป — ควรปรับบรีฟและข้อห้ามให้ตรงกับแบรนด์
            และตรวจสิทธิ์ของ reference ก่อนนำไปใช้เชิงพาณิชย์
          </p>
        </div>
      </div>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        kicker={preview ? `TEMPLATE · ${preview.tag.toUpperCase()}` : 'TEMPLATE'}
        title={preview?.title}
        size="lg"
        actions={
          preview ? (
            <button type="button" className="btn btn-dark btn-sm" onClick={() => useTemplate(preview)}>
              ใช้เทมเพลตนี้ <ArrowUpRight size={14} />
            </button>
          ) : undefined
        }
      >
        {preview && previewResult && (
          <div className="template-preview">
            <div className="template-preview-side">
              <ArtTile
                swatch={preview.swatch}
                ratio="portrait"
                label={preview.tag}
                seed={preview.id}
                className="template-preview-art"
              />
              <div className="template-preview-meta">
                <div>
                  <span>ประเภทงาน</span>
                  <strong>{findTask((preview.input.task ?? DEFAULT_INPUT.task) as PromptInput['task'])?.th}</strong>
                </div>
                <div>
                  <span>แนวภาพ</span>
                  <strong>{STYLES.find((item) => item.id === (preview.input.style ?? DEFAULT_INPUT.style))?.th}</strong>
                </div>
                <div>
                  <span>แสง</span>
                  <strong>{LIGHTINGS.find((item) => item.id === (preview.input.lighting ?? DEFAULT_INPUT.lighting))?.th}</strong>
                </div>
                <div>
                  <span>พาเลตต์</span>
                  <strong>{PALETTES.find((item) => item.id === (preview.input.palette ?? DEFAULT_INPUT.palette))?.th ?? 'กำหนดเอง'}</strong>
                </div>
              </div>
            </div>

            <div className="template-preview-main">
              <p className="template-preview-desc">{preview.description}</p>
              <div className="template-brief">
                <span className="pop-kicker">BRIEF ที่ให้มา</span>
                <p>{preview.input.brief ?? DEFAULT_INPUT.brief}</p>
              </div>
              <div className="template-prompt-head">
                <span className="pop-kicker">พรอมป์ที่ระบบสร้างให้</span>
                <button
                  type="button"
                  className="text-btn"
                  onClick={async () => {
                    const ok = await copyText(previewResult.toolPrompt)
                    show(ok ? 'คัดลอกพรอมป์ตัวอย่างแล้ว' : 'คัดลอกไม่สำเร็จ', ok ? 'success' : 'error')
                  }}
                >
                  <Copy size={12} /> คัดลอก
                </button>
              </div>
              <pre className="code-block compact">{previewResult.toolPrompt}</pre>
              <div className="template-preview-foot">
                <span>
                  <Sparkles size={13} /> ปรับต่อได้ทุกช่องใน Studio
                </span>
                <button type="button" className="btn btn-accent btn-sm" onClick={() => useTemplate(preview)}>
                  <Wand2 size={14} /> เปิดใน Studio
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
