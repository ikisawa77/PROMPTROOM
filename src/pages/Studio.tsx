import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock,
  Copy,
  Dices,
  ExternalLink,
  LayoutTemplate,
  Loader2,
  Palette,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react'
import type { BrandKit, GenerateResult, PromptInput, TaskId, ToolId } from '../../shared/types'
import {
  ASPECTS,
  CAMERAS,
  COMPOSITIONS,
  DEFAULT_INPUT,
  EXAMPLE_BRIEF,
  LENSES,
  LIGHTINGS,
  MEDIUMS,
  MOODS,
  PALETTES,
  STYLES,
  TASKS,
  TOOLS,
} from '../../shared/options'
import { TEMPLATES, findTemplate } from '../../shared/templates'
import { generatePrompt } from '../../shared/engine'
import { api, STUDIO_STORAGE_KEY, type Health } from '../lib/api'
import { copyLink, copyText } from '../lib/utils'
import ResultView from '../components/ResultView'
import { ChipGroup, Field, OptionGrid, RangeField, TextArea, TextInput } from '../components/Fields'
import { useToast } from '../components/Toast'
import Popover from '../components/ui/Popover'
import Modal from '../components/ui/Modal'
import ArtTile from '../components/ArtTile'
import ToolIcon from '../components/ToolIcon'

const STEPS = [
  { id: 0, label: 'บรีฟ', hint: 'งานและบริบท' },
  { id: 1, label: 'ทิศทางภาพ', hint: 'สไตล์และเครื่องมือ' },
  { id: 2, label: 'ระบบ', hint: 'ส่งมอบและสร้าง' },
]

function loadInput(): PromptInput {
  try {
    const raw = localStorage.getItem(STUDIO_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PromptInput>
      return { ...DEFAULT_INPUT, ...parsed }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_INPUT }
}

function pickId(list: Array<{ id: string }>, exclude?: string): string {
  const pool = list.length > 1 && exclude ? list.filter((item) => item.id !== exclude) : list
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? list[0]?.id ?? ''
}

export default function Studio() {
  const { show } = useToast()
  const [params] = useSearchParams()
  const [input, setInput] = useState<PromptInput>(loadInput)
  const [step, setStep] = useState(0)
  const [brands, setBrands] = useState<BrandKit[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [savedId, setSavedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [boosted, setBoosted] = useState('')
  const [boosting, setBoosting] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showBrands, setShowBrands] = useState(false)
  const [draftState, setDraftState] = useState<'saved' | 'saving'>('saved')
  const [draftTime, setDraftTime] = useState('')

  const appliedTemplate = useRef('')
  const appliedBrand = useRef('')
  const previewRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    api
      .brands()
      .then((data) => {
        setBrands(data.brands)
        setDraftTime(
          new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
        )
      })
      .catch(() => setBrands([]))
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [])

  useEffect(() => {
    setDraftState('saving')
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(input))
      } catch {
        /* ignore */
      }
      setDraftState('saved')
      setDraftTime(new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(new Date()))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [input])

  const applyTemplate = (id: string) => {
    const template = findTemplate(id)
    if (!template) return
    appliedTemplate.current = id
    setTemplateId(id)
    setInput({ ...DEFAULT_INPUT, ...template.input })
    setResult(null)
    setSavedId('')
    setBoosted('')
    setStep(0)
    setShowTemplates(false)
    show(`โหลดเทมเพลต “${template.title}” แล้ว`, 'success')
  }

  const queryTemplate = params.get('template')
  useEffect(() => {
    if (!queryTemplate || appliedTemplate.current === queryTemplate) return
    applyTemplate(queryTemplate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryTemplate])

  const applyBrand = (kit: BrandKit) => {
    setInput((previous) => ({
      ...previous,
      brandKitId: kit.id,
      brand: kit.name,
      audience: kit.audience,
      palette: kit.palette.length ? 'custom' : previous.palette,
      customPalette: kit.palette.length ? kit.palette.join(', ') : previous.customPalette,
      avoid: [previous.avoid, kit.avoid].filter(Boolean).join(', ').slice(0, 800),
      extraNotes: [previous.extraNotes, kit.keywords ? `Brand keywords: ${kit.keywords}` : '']
        .filter(Boolean)
        .join(' · ')
        .slice(0, 1200),
    }))
    setShowBrands(false)
    show(`ใช้ Brand Kit “${kit.name}” แล้ว`, 'success')
  }

  const brandId = params.get('brand')
  useEffect(() => {
    if (!brandId || !brands.length || appliedBrand.current === brandId) return
    const kit = brands.find((brand) => brand.id === brandId)
    if (!kit) return
    appliedBrand.current = brandId
    applyBrand(kit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, brands])

  const update = <K extends keyof PromptInput>(key: K, value: PromptInput[K]) => {
    setInput((previous) => ({ ...previous, [key]: value }))
  }

  const changeTask = (task: TaskId) => {
    setInput((previous) => {
      const next = { ...previous, task }
      if (task === 'video' && previous.tool === 'midjourney') next.tool = 'runway'
      if (task !== 'video' && ['runway', 'kling', 'sora'].includes(previous.tool)) next.tool = 'midjourney'
      if (task === 'series' && previous.seriesCount < 3) next.seriesCount = 6
      if (task === 'video' && previous.duration < 5) next.duration = 10
      return next
    })
  }

  const onBrandSelect = (id: string) => {
    if (!id) {
      update('brandKitId', '')
      return
    }
    const kit = brands.find((brand) => brand.id === id)
    if (kit) applyBrand(kit)
  }

  const completeness = useMemo(() => {
    const checks = [
      { label: 'บรีฟชัดเจน', done: input.brief.trim().length >= 20 },
      { label: 'ชื่อแบรนด์', done: Boolean(input.brand.trim()) },
      { label: 'กลุ่มเป้าหมาย', done: Boolean(input.audience.trim()) },
      { label: 'สารหลัก', done: Boolean(input.message.trim()) },
      { label: 'ข้อห้าม / negative', done: Boolean(input.negatives.trim() || input.avoid.trim()) },
      { label: 'Reference', done: Boolean(input.references.trim()) },
    ]
    const done = checks.filter((item) => item.done).length
    return { checks, done, percent: Math.round((done / checks.length) * 100) }
  }, [input])

  const live = useMemo(() => generatePrompt(input), [input])
  const selectedTool = useMemo(() => TOOLS.find((tool) => tool.id === input.tool), [input.tool])

  const generate = async () => {
    if (input.brief.trim().length < 8) {
      setError('กรุณาเขียนบรีฟอย่างน้อย 8 ตัวอักษรก่อนสร้างพรอมป์')
      setStep(0)
      window.scrollTo({ top: 120, behavior: 'smooth' })
      return
    }
    setError('')
    setSaving(true)
    setBoosted('')
    try {
      const response = await api.generate(input)
      setResult(response.result)
      setSavedId(response.id)
      show('สร้างพรอมป์และบันทึกเข้าคลังแล้ว', 'success')
      window.setTimeout(() => {
        if (window.innerWidth < 1024 && previewRef.current) {
          previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 120)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'สร้างพรอมป์ไม่สำเร็จ'
      setError(message)
      show(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const boost = async () => {
    if (!result) return
    setBoosting(true)
    try {
      const response = await api.boost({
        masterPrompt: result.masterPrompt,
        toolPrompt: result.toolPrompt,
        tool: result.tool,
        mode: 'translate',
      })
      setBoosted(response.text)
      show('AI Boost ปรับพรอมป์แล้ว', 'success')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'AI Boost ไม่สำเร็จ'
      setBoosted('')
      show('AI Boost ไม่พร้อมใช้งาน — ใช้พรอมป์ต้นฉบับแทน', 'warn', message)
    } finally {
      setBoosting(false)
    }
  }

  const reset = () => {
    setInput({ ...DEFAULT_INPUT })
    setResult(null)
    setSavedId('')
    setBoosted('')
    setTemplateId('')
    appliedTemplate.current = ''
    setStep(0)
    show('ล้างฟอร์มแล้ว')
  }

  const randomize = () => {
    setInput((previous) => ({
      ...previous,
      style: pickId(STYLES, previous.style),
      lighting: pickId(LIGHTINGS, previous.lighting),
      palette: pickId(PALETTES, previous.palette),
      lens: pickId(LENSES, previous.lens),
      composition: pickId(COMPOSITIONS, previous.composition),
      mood: pickId(MOODS, previous.mood),
    }))
    show('สุ่มทิศทางภาพชุดใหม่แล้ว', 'success')
  }

  const share = async () => {
    if (!savedId) return
    const ok = await copyLink(`/library?prompt=${savedId}`)
    show(ok ? 'คัดลอกลิงก์แชร์แล้ว' : 'คัดลอกลิงก์ไม่สำเร็จ', ok ? 'success' : 'error')
  }

  const toolGroups = useMemo(
    () => ({
      image: TOOLS.filter((tool) => tool.group === 'image'),
      video: TOOLS.filter((tool) => tool.group === 'video'),
    }),
    [],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        if (!saving) generate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="studio-page">
      <div className="container">
        <div className="page-head studio-head">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              STUDIO / PROMPT BUILDER
            </div>
            <h1 className="page-title">
              สร้างพรอมป์
              <br />
              ที่<span className="accent">กำกับได้จริง</span>
            </h1>
            <p className="page-desc">
              กรอกบรีฟภาษาไทย เลือกทิศทางภาพและเครื่องมือ ระบบจะประกอบเป็นพรอมป์พร้อมใช้
              พร้อมทางเลือกสำหรับพิตช์และ Checklist ก่อนผลิต
            </p>
          </div>
          <div className="studio-head-side">
            <div className="system-pill">
              <span className={`status-dot ${health ? 'is-live' : 'is-off'}`} />
              {health ? 'API ONLINE' : 'API OFFLINE'}
              <span className="system-pill-meta">
                {health ? `${health.version} · AI ${health.aiEnabled ? 'ON' : 'OFF'}` : 'ตรวจการเชื่อมต่อ'}
              </span>
            </div>
            <div className="draft-chip" title="ข้อมูลฟอร์มถูกจำไว้ในเบราว์เซอร์นี้">
              <Clock size={12} />
              {draftState === 'saving' ? 'กำลังจำ draft…' : `จำ draft แล้ว ${draftTime}`}
            </div>
            <div className="studio-head-links">
              <Link to="/library" className="text-link">
                คลังพรอมป์ <ArrowUpRight size={14} />
              </Link>
              <Link to="/brands" className="text-link">
                Brand Kits <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        <div className="wizard-bar">
          {STEPS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`wizard-step${step === item.id ? ' is-active' : ''}${step > item.id ? ' is-done' : ''}`}
              onClick={() => setStep(item.id)}
            >
              <span className="wizard-no">{step > item.id ? <Check size={13} /> : `0${item.id + 1}`}</span>
              <span>
                <strong>{item.label}</strong>
                <em>{item.hint}</em>
              </span>
            </button>
          ))}
          <div className="wizard-progress">
            <span style={{ width: `${((step + 1) / 3) * 100}%` }} />
          </div>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <CircleAlert size={16} />
            {error}
            <button type="button" className="text-btn error-dismiss" onClick={() => setError('')}>
              ปิด
            </button>
          </div>
        )}

        <div className="studio-grid">
          <section className="studio-form">
            {step === 0 && (
              <div className="form-step">
                <div className="form-step-head">
                  <span className="form-step-no">STEP 01</span>
                  <h2>บรีฟและบริบท</h2>
                  <p>บอกให้ชัดว่าเห็นอะไร ใช้ที่ไหน และอะไรต้องไม่เกิดขึ้น</p>
                </div>

                <Field label="ประเภทงาน" hint="กำหนดโครงผลลัพธ์">
                  <OptionGrid
                    options={TASKS}
                    value={input.task}
                    onChange={(value) => changeTask(value as TaskId)}
                    columns={2}
                  />
                </Field>

                <div className="source-cards">
                  <button type="button" className="source-card" onClick={() => setShowTemplates(true)}>
                    <span className="source-icon">
                      <LayoutTemplate size={18} />
                    </span>
                    <span>
                      <strong>เริ่มจากเทมเพลต</strong>
                      <em>{templateId ? findTemplate(templateId)?.title : `${TEMPLATES.length} โจทย์งานจริง`}</em>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                  <button type="button" className="source-card" onClick={() => setShowBrands(true)}>
                    <span className="source-icon">
                      <Palette size={18} />
                    </span>
                    <span>
                      <strong>โหลด Brand Kit</strong>
                      <em>
                        {brands.find((brand) => brand.id === input.brandKitId)?.name ??
                          (brands.length ? `${brands.length} แบรนด์พร้อมใช้` : 'ยังไม่มี Brand Kit')}
                      </em>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                </div>

                <Field
                  label="บรีฟ"
                  hint={`${input.brief.length} ตัวอักษร · อย่างน้อย 8`}
                  tip="เขียนสิ่งที่เห็นจริง วัสดุ แสง ฉาก และสิ่งที่ต้องไม่เกิด ยิ่งระบุชัด ผลลัพธ์ยิ่งซ้ำได้"
                >
                  <TextArea
                    value={input.brief}
                    onChange={(event) => update('brief', event.target.value)}
                    rows={6}
                    placeholder="เช่น ภาพสินค้าเซรั่มจากพืชพรรณไทยในขวดแก้วอำพัน วางบนหินทรายธรรมชาติ มีใบเตยและหยดน้ำ ต้องการภาพพรีเมียมแต่เข้าถึงได้ สำหรับแคมเปญเปิดตัว..."
                  />
                  <div className="field-actions">
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => update('brief', EXAMPLE_BRIEF)}
                    >
                      <Sparkles size={13} /> ใส่บรีฟตัวอย่าง
                    </button>
                    <span className="field-hint">ยิ่งระบุวัสดุ แสง และสิ่งที่ห้ามชัด ผลยิ่งซ้ำได้</span>
                  </div>
                </Field>

                <div className="field-row">
                  <Field label="ชื่อแบรนด์ / โปรเจกต์">
                    <TextInput
                      value={input.brand}
                      onChange={(event) => update('brand', event.target.value)}
                      placeholder="Siam Botanica"
                    />
                  </Field>
                  <Field label="กลุ่มเป้าหมาย">
                    <TextInput
                      value={input.audience}
                      onChange={(event) => update('audience', event.target.value)}
                      placeholder="ผู้หญิง 28–45 ปี ที่สนใจสกินแคร์ธรรมชาติ"
                    />
                  </Field>
                </div>

                <Field label="สารหลักที่อยากสื่อ" hint="หนึ่งประโยคที่คนควรจำได้">
                  <TextInput
                    value={input.message}
                    onChange={(event) => update('message', event.target.value)}
                    placeholder="ความงามที่มาจากพืชพรรณไทย"
                  />
                </Field>

                <div className="form-nav">
                  <span className="form-nav-note">ขั้นตอนที่ 1 จาก 3</span>
                  <button type="button" className="btn btn-dark" onClick={() => setStep(1)}>
                    ต่อไป: ทิศทางภาพ
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="form-step">
                <div className="form-step-head">
                  <span className="form-step-no">STEP 02</span>
                  <h2>ทิศทางภาพและเครื่องมือ</h2>
                  <p>เลือกให้พอดีกับงาน ไม่ต้องเลือกทุกช่อง ระบบจะเติมค่าที่เหลือให้</p>
                  <button type="button" className="btn btn-line btn-sm random-btn" onClick={randomize}>
                    <Dices size={15} />
                    สุ่มทิศทางภาพ
                  </button>
                </div>

                <Field label="สื่อ / ประเภทภาพ">
                  <ChipGroup options={MEDIUMS} value={input.medium} onChange={(value) => update('medium', value)} />
                </Field>

                <Field label="แนวภาพ" hint="เลือก 1 แนวเป็นแกนหลัก">
                  <OptionGrid
                    options={STYLES}
                    value={input.style}
                    onChange={(value) => update('style', value)}
                    columns={3}
                  />
                </Field>

                <Field label="เครื่องมือปลายทาง" hint="พารามิเตอร์จะปรับตามเครื่องมือ">
                  <div className="tool-groups">
                    <div>
                      <span className="group-label">IMAGE</span>
                      <OptionGrid
                        options={toolGroups.image.map((tool) => ({
                          id: tool.id,
                          th: tool.name,
                          desc: tool.best,
                          icon: <ToolIcon id={tool.id} size={24} />,
                        }))}
                        value={input.tool}
                        onChange={(value) => update('tool', value as ToolId)}
                        columns={2}
                      />
                    </div>
                    <div>
                      <span className="group-label">VIDEO</span>
                      <OptionGrid
                        options={toolGroups.video.map((tool) => ({
                          id: tool.id,
                          th: tool.name,
                          desc: tool.best,
                          icon: <ToolIcon id={tool.id} size={24} />,
                        }))}
                        value={input.tool}
                        onChange={(value) => update('tool', value as ToolId)}
                        columns={2}
                      />
                    </div>
                  </div>
                  {selectedTool && (
                    <div className="selected-tool-note">
                      <ToolIcon id={selectedTool.id} size={30} />
                      <div>
                        <strong>
                          {selectedTool.name} · {selectedTool.best}
                        </strong>
                        <p>{selectedTool.note}</p>
                      </div>
                      <span className={`tool-support${selectedTool.supportsNegative ? ' is-yes' : ''}`}>
                        {selectedTool.supportsNegative ? 'รองรับ negative' : 'ไม่มี negative'}
                      </span>
                    </div>
                  )}
                </Field>

                <div className="field-row">
                  <Field label="อัตราส่วน" tip="เลือกอัตราส่วนให้ตรงกับที่ต้องส่งมอบ เช่น 4:5 สำหรับฟีด IG หรือ 16:9 สำหรับวิดีโอ">
                    <ChipGroup options={ASPECTS} value={input.aspect} onChange={(value) => update('aspect', value)} />
                  </Field>
                  <Field label="เลนส์" tip="เลนส์ช่วยกำหนดระยะและความบิดของภาพ เช่น 24mm กว้าง 100mm แบนและเก็บรายละเอียด">
                    <ChipGroup options={LENSES} value={input.lens} onChange={(value) => update('lens', value)} />
                  </Field>
                </div>

                <Field label="องค์ประกอบภาพ">
                  <ChipGroup
                    options={COMPOSITIONS}
                    value={input.composition}
                    onChange={(value) => update('composition', value)}
                  />
                </Field>

                <Field label="แสง">
                  <ChipGroup
                    options={LIGHTINGS}
                    value={input.lighting}
                    onChange={(value) => update('lighting', value)}
                  />
                </Field>

                <Field label="พาเลตต์สี" hint="หรือกำหนดเองด้วยรหัสสี/คำบรรยาย">
                  <ChipGroup
                    options={PALETTES}
                    value={input.palette}
                    onChange={(value) => update('palette', value)}
                    withSwatch
                    allowCustom
                  />
                  {input.palette === 'custom' && (
                    <TextInput
                      className="mt-2"
                      value={input.customPalette}
                      onChange={(event) => update('customPalette', event.target.value)}
                      placeholder="#3f4a35, #c8a96a, #e5e0d0 — earth green with warm brass"
                    />
                  )}
                </Field>

                <div className="field-row">
                  <Field label="อารมณ์">
                    <ChipGroup options={MOODS} value={input.mood} onChange={(value) => update('mood', value)} />
                  </Field>
                  {input.task === 'video' && (
                    <Field label="การเคลื่อนกล้อง">
                      <ChipGroup options={CAMERAS} value={input.camera} onChange={(value) => update('camera', value)} />
                    </Field>
                  )}
                </div>

                {input.task === 'video' && (
                  <div className="field-row">
                    <Field label="ความยาวคลิป">
                      <RangeField
                        value={input.duration}
                        onChange={(value) => update('duration', value)}
                        min={5}
                        max={60}
                        step={5}
                        suffix=" วินาที"
                        hint="สั้นและชัดดีกว่ายาวแต่จำเจ"
                      />
                    </Field>
                    <Field label="จำนวนช็อต">
                      <RangeField
                        value={input.seriesCount}
                        onChange={(value) => update('seriesCount', value)}
                        min={3}
                        max={8}
                        hint="ใช้สร้าง shot list"
                      />
                    </Field>
                  </div>
                )}

                {input.task === 'series' && (
                  <Field label="จำนวนภาพในซีรีส์" hint="3–8 ภาพ ต่อหนึ่งชุด">
                    <RangeField
                      value={input.seriesCount}
                      onChange={(value) => update('seriesCount', value)}
                      min={3}
                      max={8}
                      suffix=" ภาพ"
                      hint="คุมโทนได้ง่ายกว่าเมื่อไม่เยอะเกิน"
                    />
                  </Field>
                )}

                <button type="button" className="advanced-toggle" onClick={() => setAdvanced((value) => !value)}>
                  {advanced ? 'ซ่อนการตั้งค่าขั้นสูง' : 'การตั้งค่าขั้นสูง (seed / stylize)'}
                  <span>{advanced ? '−' : '+'}</span>
                </button>

                {advanced && (
                  <div className="advanced-panel">
                    <div className="field-row">
                      <Field label="Seed" hint="ใส่เมื่อต้องการเทียบผลอย่างเป็นธรรม">
                        <TextInput
                          value={input.seed}
                          onChange={(event) => update('seed', event.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="เช่น 128473"
                          inputMode="numeric"
                        />
                      </Field>
                      <Field label="Stylize (Midjourney)">
                        <RangeField
                          value={input.stylize}
                          onChange={(value) => update('stylize', value)}
                          min={0}
                          max={1000}
                          step={50}
                          hint="สูง = ตีความเยอะ"
                        />
                      </Field>
                    </div>
                    <p className="advanced-note">
                      ค่า stylize มีผลกับ Midjourney เป็นหลัก เครื่องมืออื่นจะใช้ guidance/steps ตามค่าแนะนำของระบบ
                    </p>
                  </div>
                )}

                <div className="form-nav">
                  <button type="button" className="btn btn-line" onClick={() => setStep(0)}>
                    <ArrowLeft size={16} /> ย้อนกลับ
                  </button>
                  <button type="button" className="btn btn-dark" onClick={() => setStep(2)}>
                    ต่อไป: ระบบส่งมอบ
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="form-step">
                <div className="form-step-head">
                  <span className="form-step-no">STEP 03</span>
                  <h2>ระบบส่งมอบและข้อจำกัด</h2>
                  <p>กำหนดจำนวนทางเลือก ภาษา และสิ่งที่ทีมต้องระวังก่อนผลิต</p>
                </div>

                <div className="field-row">
                  <Field label="จำนวนเส้นทางสร้างสรรค์">
                    <RangeField
                      value={input.variations}
                      onChange={(value) => update('variations', value)}
                      min={2}
                      max={4}
                      suffix=" routes"
                      hint="เหมาะกับพิตช์ลูกค้า"
                    />
                  </Field>
                  <Field label="ภาษาของ Master prompt">
                    <div className="segmented">
                      <button
                        type="button"
                        className={input.language === 'th' ? 'is-active' : ''}
                        onClick={() => update('language', 'th')}
                      >
                        ไทย
                      </button>
                      <button
                        type="button"
                        className={input.language === 'en' ? 'is-active' : ''}
                        onClick={() => update('language', 'en')}
                      >
                        English
                      </button>
                    </div>
                    <p className="field-hint mt-1">
                      พรอมป์สำหรับเครื่องมือภาพเป็นภาษาอังกฤษเสมอ เพื่อความแม่นยำของโมเดล
                    </p>
                  </Field>
                </div>

                <Field
                  label="Negative prompt"
                  hint="คำที่ไม่อยากเห็นในภาพ"
                  tip="ใส่เฉพาะคำที่เกี่ยวกับภาพจริง เช่น extra fingers, plastic skin, warped text — อย่าใส่คำอารมณ์กว้าง ๆ"
                >
                  <TextArea
                    value={input.negatives}
                    onChange={(event) => update('negatives', event.target.value)}
                    rows={3}
                    placeholder="เช่น extra fingers, plastic skin, warped text, busy background"
                  />
                </Field>

                <Field label="สิ่งที่ต้องหลีกเลี่ยงเพิ่มเติม" hint="ข้อห้ามระดับแบรนด์">
                  <TextArea
                    value={input.avoid}
                    onChange={(event) => update('avoid', event.target.value)}
                    rows={3}
                    placeholder="เช่น ห้ามใช้ภาพโทนฟ้าเย็น, ห้ามอ้างชื่อศิลปินที่มีชีวิต, ห้ามใส่ข้อความในภาพ"
                  />
                </Field>

                <Field label="Reference และสิทธิ์" hint="ระบุที่มาและข้อจำกัดการใช้งาน">
                  <TextArea
                    value={input.references}
                    onChange={(event) => update('references', event.target.value)}
                    rows={3}
                    placeholder="เช่น moodboard ภายในทีม 3 ภาพ (ใช้เป็นแนวทางเท่านั้น) / ภาพสินค้าจริงจากลูกค้า"
                  />
                </Field>

                <Field label="โน้ตเพิ่มเติมถึง AI หรือทีมผลิต">
                  <TextArea
                    value={input.extraNotes}
                    onChange={(event) => update('extraNotes', event.target.value)}
                    rows={3}
                    placeholder="เช่น ต้องมีพื้นที่ด้านซ้ายสำหรับพาดหัว 1 บรรทัด, หลีกเลี่ยงการครอปที่มือ"
                  />
                </Field>

                <div className="readiness">
                  <div className="readiness-head">
                    <span>ความพร้อมของบรีฟ</span>
                    <strong>{completeness.percent}%</strong>
                  </div>
                  <div className="readiness-bar">
                    <span style={{ width: `${completeness.percent}%` }} />
                  </div>
                  <div className="readiness-list">
                    {completeness.checks.map((check) => (
                      <span key={check.label} className={check.done ? 'is-done' : ''}>
                        {check.done ? <Check size={12} /> : <CircleAlert size={12} />}
                        {check.label}
                      </span>
                    ))}
                  </div>
                  <p className="readiness-note">
                    ช่องที่ไม่บังคับสามารถเว้นได้ แต่การเติมข้อมูลจะทำให้พรอมป์เฉพาะกับแบรนด์มากขึ้น
                  </p>
                </div>

                <div className="generate-row">
                  <button type="button" className="btn btn-line" onClick={() => setStep(1)}>
                    <ArrowLeft size={16} /> ย้อนกลับ
                  </button>
                  <button type="button" className="btn btn-accent btn-lg generate-btn" onClick={generate} disabled={saving}>
                    {saving ? <Loader2 size={18} className="spin" /> : <Wand2 size={18} />}
                    {saving ? 'กำลังประกอบพรอมป์…' : 'สร้างและบันทึกพรอมป์'}
                  </button>
                </div>

                <div className="generate-notes">
                  <span>
                    <Check size={12} /> บันทึกเข้าคลังอัตโนมัติ
                  </span>
                  <span>
                    <Check size={12} /> พร้อม Master prompt + routes
                  </span>
                  <span>
                    <Check size={12} /> ดาวน์โหลด .md / .csv
                  </span>
                  <span className="kbd-hint">
                    <kbd>Ctrl</kbd> + <kbd>Enter</kbd> เพื่อสร้าง
                  </span>
                </div>
              </div>
            )}
          </section>

          <aside className="studio-preview" ref={previewRef}>
            <div className="preview-head">
              <div className="preview-title">
                <span className={`status-dot ${result ? 'is-live' : ''}`} />
                {result ? 'OUTPUT / SAVED' : 'OUTPUT / LIVE PREVIEW'}
              </div>
              <div className="preview-actions">
                {result && (
                  <>
                    <Link to="/library" className="preview-link">
                      คลัง <ArrowUpRight size={13} />
                    </Link>
                    <button type="button" className="icon-btn icon-btn-dark" onClick={reset} aria-label="ล้างฟอร์ม">
                      <RotateCcw size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {result ? (
              <>
                <div className="preview-saved-bar">
                  <span>
                    <Check size={13} /> บันทึกเข้าคลังแล้ว
                  </span>
                  <button type="button" className="text-btn text-btn-light" onClick={generate} disabled={saving}>
                    {saving ? 'กำลังสร้างใหม่…' : 'สร้างเวอร์ชันใหม่'}
                  </button>
                </div>
                <ResultView
                  result={result}
                  savedId={savedId}
                  boosted={boosted}
                  onBoost={boost}
                  boosting={boosting}
                  aiEnabled={Boolean(health?.aiEnabled)}
                  onShare={share}
                />
              </>
            ) : (
              <div className="live-panel">
                <div className="live-meta">
                  <span className="live-tool">
                    <ToolIcon id={input.tool} size={18} /> {live.toolName}
                  </span>
                  <span>{live.input.aspect}</span>
                  <span>{live.variations.length} routes</span>
                </div>

                <div className="anatomy">
                  <div className="anatomy-row">
                    <span>SUBJECT</span>
                    <p>{input.brief ? input.brief.slice(0, 110) + (input.brief.length > 110 ? '…' : '') : 'ยังไม่มีบรีฟ — เริ่มจาก STEP 01'}</p>
                  </div>
                  <div className="anatomy-row">
                    <span>DIRECTION</span>
                    <p>
                      {STYLES.find((item) => item.id === input.style)?.th} ·{' '}
                      {COMPOSITIONS.find((item) => item.id === input.composition)?.th} ·{' '}
                      {LIGHTINGS.find((item) => item.id === input.lighting)?.th}
                    </p>
                  </div>
                  <div className="anatomy-row">
                    <span>PALETTE</span>
                    <p>
                      {input.palette === 'custom'
                        ? input.customPalette || 'กำหนดเอง'
                        : PALETTES.find((item) => item.id === input.palette)?.th}{' '}
                      · {LENSES.find((item) => item.id === input.lens)?.th}
                    </p>
                  </div>
                  <div className="anatomy-row">
                    <span>TOOL</span>
                    <p>{live.parameterLine}</p>
                  </div>
                </div>

                <div className="preview-code-head">
                  <span>PROMPT PREVIEW</span>
                  <div className="preview-code-actions">
                    <button
                      type="button"
                      className="text-btn text-btn-light"
                      onClick={() => {
                        const text = `${JSON.stringify(input, null, 2)}`
                        void copyText(text).then((ok) => show(ok ? 'คัดลอกค่า input แล้ว' : 'คัดลอกไม่สำเร็จ', ok ? 'success' : 'error'))
                      }}
                    >
                      คัดลอกค่า
                    </button>
                    <button
                      type="button"
                      className="text-btn text-btn-light"
                      onClick={async () => {
                        const ok = await copyText(live.toolPrompt)
                        show(ok ? 'คัดลอกพรีวิวแล้ว' : 'คัดลอกไม่สำเร็จ', ok ? 'success' : 'error')
                      }}
                    >
                      <Copy size={12} /> คัดลอก
                    </button>
                  </div>
                </div>
                <pre className="preview-code">{live.toolPrompt}</pre>

                <div className="live-readiness">
                  <div className="readiness-head">
                    <span>BRIEF READINESS</span>
                    <strong>{completeness.percent}%</strong>
                  </div>
                  <div className="readiness-bar">
                    <span style={{ width: `${completeness.percent}%` }} />
                  </div>
                  <p>
                    {completeness.percent >= 80
                      ? 'ข้อมูลพร้อมสร้างแล้ว — กดปุ่มสีส้มเพื่อบันทึกเข้าคลัง'
                      : `ยังขาด ${6 - completeness.done} องค์ประกอบ แต่สามารถสร้างได้ทันที`}
                  </p>
                </div>

                <div className="live-notes">
                  <p>
                    <Sparkles size={13} /> หลังสร้างแล้วคุณจะได้ Master prompt, พรอมป์พร้อมใช้, 3 เส้นทาง,
                    ตารางซีรีส์/ช็อต และ Checklist ในที่เดียว
                  </p>
                  {!health?.aiEnabled && (
                    <p className="live-note-muted">
                      AI Boost ยังไม่เปิด — ตั้งค่า OPENAI_API_KEY ใน .env เพื่อแปลบรีฟไทยเป็นพรอมป์อังกฤษธรรมชาติ
                    </p>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <Modal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        kicker="TEMPLATES"
        title="เริ่มจากโจทย์งานจริง"
        size="lg"
      >
        <div className="picker-grid">
          {TEMPLATES.map((template, index) => (
            <button
              type="button"
              className="picker-card"
              key={template.id}
              onClick={() => applyTemplate(template.id)}
            >
              <ArtTile
                swatch={template.swatch}
                ratio="wide"
                index={`0${index + 1}`}
                label={template.tag}
                seed={template.id}
              />
              <span className="picker-copy">
                <strong>{template.title}</strong>
                <em>{template.description}</em>
              </span>
              <span className="picker-cta">
                ใช้เทมเพลต <ArrowUpRight size={13} />
              </span>
            </button>
          ))}
        </div>
        <p className="picker-note">
          การเลือกเทมเพลตจะแทนที่ค่าปัจจุบันในฟอร์ม (draft ที่ยังไม่ได้สร้างจะถูกเขียนทับ)
        </p>
      </Modal>

      <Modal
        open={showBrands}
        onClose={() => setShowBrands(false)}
        kicker="BRAND KITS"
        title="โหลดเสียงของแบรนด์"
        size="md"
        actions={
          <Link to="/brands" className="btn btn-line btn-sm">
            จัดการ Brand Kits <ExternalLink size={13} />
          </Link>
        }
      >
        {brands.length === 0 ? (
          <div className="empty-state compact">
            <div className="empty-mark">◇</div>
            <h2>ยังไม่มี Brand Kit</h2>
            <p>สร้าง Brand Kit เพื่อเติมกลุ่มเป้าหมาย พาเลตต์ และข้อห้ามให้อัตโนมัติ</p>
            <Link to="/brands" className="btn btn-dark">
              ไปสร้าง Brand Kit <ArrowUpRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="brand-picker">
            {brands.map((brand) => (
              <button
                type="button"
                className={`brand-pick${input.brandKitId === brand.id ? ' is-active' : ''}`}
                key={brand.id}
                onClick={() => applyBrand(brand)}
              >
                <span
                  className="brand-avatar"
                  style={{
                    background: brand.palette.length
                      ? `linear-gradient(135deg, ${brand.palette.join(', ')})`
                      : 'linear-gradient(135deg, #3f4a35, #c8a96a)',
                  }}
                >
                  {brand.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="brand-pick-copy">
                  <strong>{brand.name}</strong>
                  <em>{brand.industry || brand.audience || 'Brand Kit'}</em>
                  <span className="brand-pick-palette">
                    {(brand.palette.length ? brand.palette : ['#e5e0d0', '#c8a96a', '#3f4a35']).map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>
                </span>
                {input.brandKitId === brand.id ? <Check size={15} /> : <ArrowUpRight size={15} />}
              </button>
            ))}
            <button
              type="button"
              className="brand-pick is-detach"
              onClick={() => {
                update('brandKitId', '')
                setShowBrands(false)
              }}
            >
              <span className="brand-avatar is-detach">—</span>
              <span className="brand-pick-copy">
                <strong>ไม่ใช้ Brand Kit</strong>
                <em>เก็บค่าที่กรอกไว้เท่านั้น</em>
              </span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
