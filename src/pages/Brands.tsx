import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { BrandKit } from '../../shared/types'
import { api } from '../lib/api'
import { copyText } from '../lib/utils'
import { useToast } from '../components/Toast'
import Illustration from '../components/Illustration'
import { Field, TextArea, TextInput } from '../components/Fields'
import Modal from '../components/ui/Modal'
import Popover from '../components/ui/Popover'

interface Draft {
  name: string
  industry: string
  audience: string
  tone: string
  palette: string
  keywords: string
  avoid: string
}

const EMPTY: Draft = {
  name: '',
  industry: '',
  audience: '',
  tone: '',
  palette: '#3f4a35, #c8a96a, #e5e0d0',
  keywords: '',
  avoid: '',
}

const PRESETS: Array<{ label: string; palette: string }> = [
  { label: 'พฤกษา', palette: '#3f4a35, #c8a96a, #e5e0d0, #2b2621' },
  { label: 'คาเฟ่', palette: '#8c3b2e, #e5d5bd, #3b2f2a, #6b7a54' },
  { label: 'พรีเมียม', palette: '#e8ded2, #8c3b2e, #2f2a26, #111111' },
  { label: 'เทคโนโลยี', palette: '#0e1620, #264653, #d8ff4f, #f2efe7' },
  { label: 'ซอฟต์', palette: '#f4e9d8, #d9a7a0, #7a9e9f, #3b3a36' },
]

export default function Brands() {
  const { show } = useToast()
  const navigate = useNavigate()
  const [brands, setBrands] = useState<BrandKit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BrandKit | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError('')
    api
      .brands()
      .then((data) => setBrands(data.brands))
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'โหลด Brand Kits ไม่สำเร็จ')
        show(error instanceof Error ? error.message : 'โหลด Brand Kits ไม่สำเร็จ', 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const openCreate = () => {
    setEditing(null)
    setDraft(EMPTY)
    setOpen(true)
  }

  const openEdit = (brand: BrandKit) => {
    setEditing(brand)
    setDraft({
      name: brand.name,
      industry: brand.industry,
      audience: brand.audience,
      tone: brand.tone,
      palette: brand.palette.join(', '),
      keywords: brand.keywords,
      avoid: brand.avoid,
    })
    setOpen(true)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim()) {
      show('กรุณาตั้งชื่อแบรนด์', 'error')
      return
    }
    setSaving(true)
    const payload = {
      name: draft.name.trim(),
      industry: draft.industry.trim(),
      audience: draft.audience.trim(),
      tone: draft.tone.trim(),
      palette: draft.palette
        .split(',')
        .map((color) => color.trim())
        .filter(Boolean),
      keywords: draft.keywords.trim(),
      avoid: draft.avoid.trim(),
    }
    try {
      if (editing) {
        await api.updateBrand(editing.id, payload)
        show('อัปเดต Brand Kit แล้ว', 'success')
      } else {
        await api.createBrand(payload)
        show('สร้าง Brand Kit แล้ว', 'success')
      }
      setOpen(false)
      load()
    } catch (error) {
      show(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ', 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (brand: BrandKit) => {
    if (!window.confirm(`ลบ Brand Kit “${brand.name}”?`)) return
    try {
      await api.deleteBrand(brand.id)
      show('ลบ Brand Kit แล้ว', 'success')
      load()
    } catch (error) {
      show(error instanceof Error ? error.message : 'ลบไม่สำเร็จ', 'error')
    }
  }

  const duplicate = async (brand: BrandKit) => {
    try {
      await api.createBrand({
        name: `${brand.name} (สำเนา)`,
        industry: brand.industry,
        audience: brand.audience,
        tone: brand.tone,
        palette: brand.palette,
        keywords: brand.keywords,
        avoid: brand.avoid,
      })
      show('ทำสำเนา Brand Kit แล้ว', 'success')
      load()
    } catch (error) {
      show(error instanceof Error ? error.message : 'ทำสำเนาไม่สำเร็จ', 'error')
    }
  }

  const copyColor = async (color: string) => {
    const ok = await copyText(color)
    setCopied(color)
    window.setTimeout(() => setCopied(''), 1400)
    show(ok ? `คัดลอกสี ${color} แล้ว` : 'คัดลอกไม่สำเร็จ', ok ? 'success' : 'error')
  }

  const palette = draft.palette
    .split(',')
    .map((color) => color.trim())
    .filter(Boolean)
    .slice(0, 8)

  return (
    <div className="page brands-page">
      <div className="container">
        <div className="page-head">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              BRAND KITS / VOICE &amp; PALETTE
            </div>
            <h1 className="page-title">
              เก็บเสียงของแบรนด์
              <br />
              ไว้ใช้<span className="accent">ทุกบรีฟ</span>
            </h1>
            <p className="page-desc">
              Brand Kit เก็บกลุ่มเป้าหมาย โทน พาเลตต์ และสิ่งที่ต้องหลีกเลี่ยง
              เมื่อเลือกใน Studio ระบบจะเติมข้อมูลให้อัตโนมัติ ลดการพิมพ์ซ้ำและความผิดพลาดในทีม
            </p>
          </div>
          <div className="page-head-actions">
            <span className="count-pill">{brands.length} แบรนด์</span>
            <button type="button" className="btn btn-dark" onClick={openCreate}>
              <Plus size={16} />
              เพิ่ม Brand Kit
            </button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton-grid">
            {[0, 1, 2].map((index) => (
              <div className="skeleton-card" key={index}>
                <div className="skeleton-line wide" />
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="empty-state is-error">
            <div className="empty-mark">!</div>
            <h2>โหลด Brand Kits ไม่สำเร็จ</h2>
            <p>{loadError} — ตรวจการเชื่อมต่อ API แล้วลองอีกครั้ง</p>
            <button type="button" className="btn btn-dark" onClick={load}>
              <RotateCw size={15} /> ลองอีกครั้ง
            </button>
          </div>
        ) : brands.length === 0 ? (
          <div className="empty-state">
            <Illustration scene="bottle" className="empty-illustration" />
            <h2>ยังไม่มี Brand Kit</h2>
            <p>เริ่มจากแบรนด์ที่ทำงานบ่อยที่สุด แล้วใช้ซ้ำได้ทุกพรอมป์</p>
            <button type="button" className="btn btn-dark" onClick={openCreate}>
              <Plus size={16} /> เพิ่ม Brand Kit
            </button>
          </div>
        ) : (
          <div className="brand-grid">
            {brands.map((brand) => (
              <article className="brand-card" key={brand.id}>
                <div className="brand-card-glow" aria-hidden="true" style={{ background: brand.palette[1] ?? '#c8a96a' }} />
                <div className="brand-card-head">
                  <span
                    className="brand-avatar large"
                    style={{
                      background: brand.palette.length
                        ? `linear-gradient(135deg, ${brand.palette.join(', ')})`
                        : 'linear-gradient(135deg, #3f4a35, #c8a96a)',
                    }}
                  >
                    {brand.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="template-tag">{brand.industry || 'BRAND KIT'}</span>
                  <Popover
                    label={`ตัวเลือก ${brand.name}`}
                    align="end"
                    width={210}
                    trigger={(props) => (
                      <button type="button" className="icon-btn" aria-label="ตัวเลือกแบรนด์" {...props}>
                        <MoreHorizontal size={15} />
                      </button>
                    )}
                  >
                    {(close) => (
                      <div className="action-menu">
                        <button
                          type="button"
                          onClick={() => {
                            close()
                            openEdit(brand)
                          }}
                        >
                          <Pencil size={14} /> แก้ไข Brand Kit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            close()
                            void duplicate(brand)
                          }}
                        >
                          <Copy size={14} /> ทำสำเนา
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            close()
                            navigate(`/studio?brand=${brand.id}`)
                          }}
                        >
                          <Sparkles size={14} /> ใช้ใน Studio
                        </button>
                        <div className="action-sep" />
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            close()
                            void remove(brand)
                          }}
                        >
                          <Trash2 size={14} /> ลบ Brand Kit
                        </button>
                      </div>
                    )}
                  </Popover>
                </div>

                <h3>{brand.name}</h3>
                <p className="brand-tone-line">{brand.tone || 'ยังไม่ได้ระบุโทนเสียง'}</p>

                <div className="brand-swatches">
                  {(brand.palette.length ? brand.palette : ['#e5e0d0', '#c8a96a', '#3f4a35']).map((color, index) => (
                    <button
                      type="button"
                      key={`${color}-${index}`}
                      style={{ background: color }}
                      onClick={() => copyColor(color)}
                      aria-label={`คัดลอกสี ${color}`}
                      title={color}
                    >
                      {copied === color && <Check size={11} />}
                    </button>
                  ))}
                  {!brand.palette.length && <span className="palette-empty">ยังไม่มีพาเลตต์</span>}
                </div>

                <dl className="brand-details">
                  <div>
                    <dt>กลุ่มเป้าหมาย</dt>
                    <dd>{brand.audience || '—'}</dd>
                  </div>
                  <div>
                    <dt>คำสำคัญ</dt>
                    <dd>{brand.keywords || '—'}</dd>
                  </div>
                  <div>
                    <dt>หลีกเลี่ยง</dt>
                    <dd>{brand.avoid || '—'}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  className="text-link brand-use"
                  onClick={() => navigate(`/studio?brand=${brand.id}`)}
                >
                  ใช้ Brand Kit นี้ใน Studio <ArrowUpRight size={14} />
                </button>
              </article>
            ))}
          </div>
        )}

        <div className="brands-note">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-line" />
              คำแนะนำ
            </span>
            <h2>Brand Kit ที่ดีไม่ต้องยาว</h2>
          </div>
          <div>
            <p>
              เขียนสิ่งที่ตัดสินใจได้ เช่น “ห้ามใช้โทนฟ้าเย็น” หรือ “ภาพต้องดูเป็นธรรมชาติ ไม่เรตัชผิว”
              ดีกว่าคำคุณศัพท์กว้าง ๆ เพราะ AI และทีมผลิตนำไปใช้ได้จริงกว่า
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        kicker={editing ? 'EDIT BRAND KIT' : 'NEW BRAND KIT'}
        title={editing ? `แก้ไข ${editing.name}` : 'เพิ่ม Brand Kit ใหม่'}
        size="md"
      >
        <form onSubmit={save} className="brand-form">
          <div className="field-row">
            <Field label="ชื่อแบรนด์ *">
              <TextInput
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Siam Botanica"
                autoFocus
              />
            </Field>
            <Field label="อุตสาหกรรม / หมวดสินค้า">
              <TextInput
                value={draft.industry}
                onChange={(event) => setDraft({ ...draft, industry: event.target.value })}
                placeholder="สกินแคร์จากพืชพรรณไทย"
              />
            </Field>
          </div>
          <Field label="กลุ่มเป้าหมาย">
            <TextArea
              rows={2}
              value={draft.audience}
              onChange={(event) => setDraft({ ...draft, audience: event.target.value })}
              placeholder="ผู้หญิง 28–45 ปี ที่สนใจสกินแคร์ธรรมชาติ"
            />
          </Field>
          <Field label="โทนเสียง / บุคลิกแบรนด์" tip="เขียนเป็นคำที่ตัดสินใจได้ เช่น สงบ จริงใจ พรีเมียมแบบเข้าถึงได้">
            <TextArea
              rows={2}
              value={draft.tone}
              onChange={(event) => setDraft({ ...draft, tone: event.target.value })}
              placeholder="สงบ จริงใจ พรีเมียมแบบเข้าถึงได้"
            />
          </Field>
          <Field label="พาเลตต์สี" hint="คั่นด้วย comma รองรับ HEX">
            <TextInput
              value={draft.palette}
              onChange={(event) => setDraft({ ...draft, palette: event.target.value })}
              placeholder="#3f4a35, #c8a96a, #e5e0d0"
            />
            <div className="palette-preview">
              {palette.map((color, index) => (
                <span key={`${color}-${index}`} style={{ background: color }} />
              ))}
              {!palette.length && <em>ยังไม่มีสี — พิมพ์รหัส HEX ด้านบน</em>}
            </div>
            <div className="palette-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="palette-preset"
                  onClick={() => setDraft({ ...draft, palette: preset.palette })}
                >
                  <span>
                    {preset.palette.split(',').map((color) => (
                      <i key={color} style={{ background: color.trim() }} />
                    ))}
                  </span>
                  {preset.label}
                </button>
              ))}
            </div>
          </Field>
          <div className="field-row">
            <Field label="คำสำคัญที่ใช้บ่อย">
              <TextInput
                value={draft.keywords}
                onChange={(event) => setDraft({ ...draft, keywords: event.target.value })}
                placeholder="พฤกษา, หัตถกรรม, ความจริงใจ"
              />
            </Field>
            <Field label="สิ่งที่ต้องหลีกเลี่ยง">
              <TextInput
                value={draft.avoid}
                onChange={(event) => setDraft({ ...draft, avoid: event.target.value })}
                placeholder="ภาพผิวพลาสติก, คำว่า miracle"
              />
            </Field>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-line" onClick={() => setOpen(false)}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-dark" disabled={saving}>
              {saving && <Loader2 size={15} className="spin" />}
              {editing ? 'บันทึกการแก้ไข' : 'สร้าง Brand Kit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
