import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  Layers,
  Library as LibraryIcon,
  Plus,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { DEFAULT_INPUT, EXAMPLE_BRIEF, LIGHTINGS, PALETTES, STYLES, TOOLS } from '../../shared/options'
import { TEMPLATES } from '../../shared/templates'
import { generatePrompt } from '../../shared/engine'
import type { PromptInput, Stats } from '../../shared/types'
import { api, STUDIO_STORAGE_KEY } from '../lib/api'
import ArtTile from '../components/ArtTile'
import ToolIcon from '../components/ToolIcon'

const FEATURES = [
  {
    icon: Wand2,
    title: 'Prompt Builder',
    text: 'เลือกแนวภาพ แสง พาเลตต์ เลนส์ และเครื่องมือ ระบบประกอบเป็นพรอมป์ที่มีเหตุผลรองรับทุกบรรทัด',
    no: '01',
  },
  {
    icon: Layers,
    title: '3 Creative Routes',
    text: 'ได้ทางเลือกที่ต่างกันจริงสำหรับพิตช์ลูกค้า พร้อมบอกว่าเส้นทางไหนควรใช้เมื่อไหร่',
    no: '02',
  },
  {
    icon: Braces,
    title: 'Series System',
    text: 'แยก Fixed Block กับ Variable Block ทำให้ภาพทั้งแคมเปญคุมโทนได้เหมือนเดิม',
    no: '03',
  },
  {
    icon: Sparkles,
    title: 'Tool Syntax',
    text: 'รู้ความต่างของ Midjourney, Flux, Firefly, Ideogram, Runway และ Kling ไม่แต่งพารามิเตอร์ขึ้นเอง',
    no: '04',
  },
  {
    icon: ShieldCheck,
    title: 'Brand Kits',
    text: 'เก็บเสียงของแบรนด์ พาเลตต์ และสิ่งที่ต้องหลีกเลี่ยงไว้ใช้ซ้ำได้ทุกบรีฟในทีม',
    no: '05',
  },
  {
    icon: LibraryIcon,
    title: 'Prompt Library',
    text: 'ทุกพรอมป์ถูกบันทึกใน SQLite พร้อมเวอร์ชัน ค้นหา ดาวน์โหลด และส่งต่อให้ทีมผลิต',
    no: '06',
  },
]

const WORKFLOW = [
  { no: '01', title: 'ใส่บรีฟ', text: 'เขียนเป็นภาษาไทยได้เลย ระบุสิ่งที่เห็น กลุ่มเป้าหมาย และสิ่งที่ห้ามเกิด' },
  { no: '02', title: 'กำหนดทิศทาง', text: 'เลือกสไตล์ แสง พาเลตต์ และเครื่องมือปลายทาง ระบบจะเตือนถ้าข้อมูลยังไม่พอ' },
  { no: '03', title: 'สร้างและเลือก', text: 'ได้ Master prompt, พรอมป์พร้อมใช้, 3 เส้นทาง, ตารางซีรีส์ และ Checklist' },
  { no: '04', title: 'บันทึกและส่งต่อ', text: 'เก็บเข้าคลังของทีม ดาวน์โหลด .md หรือเปิดใน Studio เพื่อวนซ้ำอย่างมีระบบ' },
]

const FAQ = [
  {
    q: 'เว็บนี้สร้างภาพให้เลยหรือไม่?',
    a: 'ไม่ครับ — PROMPTROOM สร้าง "พรอมป์" และระบบกำกับภาพที่พร้อมนำไปใช้กับเครื่องมือภาพหรือวิดีโอ เช่น Midjourney, Flux, Firefly, Ideogram, Runway, Kling หรือ Sora โดยไม่ต้องมี API key ของเครื่องมือเหล่านั้น',
  },
  {
    q: 'ข้อมูลของฉันถูกเก็บไว้ที่ไหน?',
    a: 'ทุกพรอมป์และ Brand Kit ถูกเก็บในไฟล์ SQLite บนเครื่องของคุณ (โฟลเดอร์ data/) ไม่ได้ส่งออกไปที่ไหน เหมาะกับการทดสอบบน localhost ก่อนขึ้นโฮสต์จริง',
  },
  {
    q: 'ใช้ AI Boost ได้ไหม?',
    a: 'ได้ ถ้าตั้งค่า OPENAI_API_KEY ในไฟล์ .env ระบบจะใช้ LLM ที่คุณกำหนดเพื่อแปลบรีฟไทยเป็นอังกฤษและปรับพรอมป์ให้ลื่นขึ้น หากไม่ตั้งค่า ฟีเจอร์อื่นทั้งหมดยังใช้งานได้เต็มรูปแบบ',
  },
  {
    q: 'ทำไมต้องใช้ฟอนต์ Prompt ทั้งเว็บ?',
    a: 'Prompt เป็นฟอนต์ไทยร่วมสมัยที่อ่านง่ายทั้งหัวข้อและเนื้อหา และมีน้ำหนักให้เลือกครบ ทำให้ทั้งเว็บไซต์ — รวมถึงหน้า Control Center — ใช้ภาษาไทยได้สวยและสม่ำเสมอ',
  },
  {
    q: 'นำขึ้นโฮสต์จริงได้อย่างไร?',
    a: 'รัน npm run build แล้วอัพโหลด dist/ กับเซิร์ฟเวอร์ Express ขึ้นโฮสต์ที่รองรับ Node.js หรือแยก API กับ static hosting ก็ได้ ดูขั้นตอนใน README',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [demoStyle, setDemoStyle] = useState('editorial')
  const [demoLight, setDemoLight] = useState('soft-window')
  const [demoPalette, setDemoPalette] = useState('warm-earth')

  useEffect(() => {
    api.stats().then(setStats).catch(() => setStats(null))
  }, [])

  const demoInput: PromptInput = useMemo(
    () => ({
      ...DEFAULT_INPUT,
      brief: EXAMPLE_BRIEF,
      brand: 'Siam Botanica',
      audience: 'ผู้หญิง 28–45 ปี ที่สนใจสกินแคร์จากธรรมชาติ',
      message: 'ความงามที่มาจากพืชพรรณไทย',
      medium: 'product',
      style: demoStyle,
      lighting: demoLight,
      palette: demoPalette,
      lens: '100mm',
      aspect: '4:5',
      tool: 'midjourney',
    }),
    [demoStyle, demoLight, demoPalette],
  )

  const demoResult = useMemo(() => generatePrompt(demoInput), [demoInput])

  const openInStudio = () => {
    try {
      localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(demoInput))
    } catch {
      /* ignore */
    }
    navigate('/studio')
  }

  const openStyle = (styleId: string) => {
    try {
      localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ ...demoInput, style: styleId }))
    } catch {
      /* ignore */
    }
    navigate('/studio')
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-grid container">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              CREATIVE &amp; ART DIRECTION PROMPT ENGINE
            </div>
            <h1 className="hero-title">
              เปลี่ยนบรีฟ
              <br />
              ให้เป็น<span className="mark">พรอมป์</span>
              <br />
              ที่<span className="accent">กำกับได้จริง</span>
            </h1>
            <p className="hero-sub">
              ห้องเครื่องพรอมป์ภาษาไทยสำหรับครีเอทีฟ อาร์ตไดเรกเตอร์ และทีมการตลาด
              แปลงบรีฟให้เป็นพรอมป์ภาพ วิดีโอ และงานออกแบบที่ทำซ้ำได้ พร้อมระบบคุมโทนทั้งแคมเปญ
            </p>
            <div className="hero-actions">
              <Link to="/studio" className="btn btn-dark btn-lg">
                เริ่มสร้างพรอมป์
                <ArrowUpRight size={18} />
              </Link>
              <Link to="/templates" className="btn btn-line btn-lg">
                ดูเทมเพลต
                <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-meta">
              <span>
                <Check size={13} /> ไม่ต้องสมัคร
              </span>
              <span>
                <Check size={13} /> ฟรีทุกฟีเจอร์
              </span>
              <span>
                <Check size={13} /> ภาษาไทย 100%
              </span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orbit" />
            <ArtTile
              swatch={['#e5e0d0', '#6b7a54', '#2b2621']}
              ratio="portrait"
              className="hero-art"
              index="N° 01"
              label="SIAM BOTANICA / 4:5"
              seed="hero-botanica"
              variant="pedestal"
            >
              <div className="hero-art-rule" />
            </ArtTile>

            <div className="floating-card floating-prompt">
              <div className="floating-head">
                <span>PROMPT / READY</span>
                <ToolIcon id="midjourney" size={20} />
              </div>
              <p>
                botanical serum bottle, amber glass, sandstone pedestal, pandan leaves, soft window light,
                warm earth palette, 100mm macro, --ar 4:5 --stylize 150
              </p>
              <div className="floating-foot">
                <span className="status-dot" /> 3 routes · fixed block included
              </div>
            </div>

            <div className="floating-card floating-score">
              <span className="score-label">BRIEF SCORE</span>
              <strong>92</strong>
              <div className="score-bar">
                <i />
              </div>
            </div>

            <div className="float-chip chip-tool">MIDJOURNEY</div>
            <div className="float-chip chip-tool2">FLUX</div>
            <div className="float-chip chip-ar">4:5</div>
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="container stats-grid">
          <div className="stat">
            <strong>{stats ? String(stats.saved).padStart(2, '0') : '—'}</strong>
            <span>พรอมป์ในคลัง</span>
          </div>
          <div className="stat">
            <strong>{TOOLS.length}</strong>
            <span>เครื่องมือที่รองรับ</span>
          </div>
          <div className="stat">
            <strong>{TEMPLATES.length}</strong>
            <span>เทมเพลตตั้งต้น</span>
          </div>
          <div className="stat">
            <strong>{STYLES.length}</strong>
            <span>แนวภาพให้เลือก</span>
          </div>
          <div className="stat stat-note">
            <span className="status-dot" />
            <p>Fullstack · React + Express + SQLite<br />ทดสอบบน localhost ได้ทันที</p>
          </div>
        </div>
      </section>

      <div className="tool-marquee" aria-hidden="true">
        <div className="tool-track">
          {[0, 1].map((copy) => (
            <div className="tool-group" key={copy}>
              {TOOLS.map((tool) => (
                <span key={`${copy}-${tool.id}`} className="tool-marquee-item">
                  <ToolIcon id={tool.id} size={18} />
                  {tool.name}
                  <i>◆</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                01 / WHY PROMPTROOM
              </div>
              <h2 className="section-title">
                ปัญหาไม่ใช่ "พรอมป์ไม่เก่ง"
                <br />
                แต่คือ<span className="underline-accent">ไม่มีระบบ</span>ให้ทำซ้ำ
              </h2>
            </div>
            <p className="section-desc">
              ภาพสวยครั้งเดียวไม่พอสำหรับงานแบรนด์ สิ่งที่ทีมต้องการคือระบบที่คนอื่นเปิดมาทำต่อแล้วได้ผลใกล้เคียง
              และอธิบายได้ว่าทำไมภาพถึงออกมาแบบนั้น
            </p>
          </div>

          <div className="problem-grid">
            <article className="problem-card">
              <span className="problem-no">A</span>
              <h3>พรอมป์ยาว แต่ไร้ทิศทาง</h3>
              <p>
                คำอย่าง beautiful, 8k, masterpiece ไม่ได้บอกอะไรกับโมเดล
                ระบบนี้บังคับให้ทุกคำมีเหตุผลด้านแสง วัสดุ องค์ประกอบ หรือข้อจำกัด
              </p>
            </article>
            <article className="problem-card">
              <span className="problem-no">B</span>
              <h3>ภาพแต่ละใบคนละโลก</h3>
              <p>
                ซีรีส์แคมเปญต้องมี Fixed Block ที่ชัด เราแยกสิ่งที่ต้องคงที่ออกจากสิ่งที่เปลี่ยน
                ก่อนเขียนพรอมป์รายชิ้น
              </p>
            </article>
            <article className="problem-card">
              <span className="problem-no">C</span>
              <h3>ทีมพูดกันคนละภาษา</h3>
              <p>
                อาร์ตไดเรกเตอร์พูดถึงอารมณ์ คนผลิตพูดถึงพารามิเตอร์ ระบบแปลงทั้งสองภาษาให้อยู่ในเอกสารเดียว
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                02 / THE ENGINE
              </div>
              <h2 className="section-title">
                หกส่วนที่ทำให้พรอมป์
                <br />
                กลายเป็น<span className="mark">ระบบงาน</span>
              </h2>
            </div>
            <p className="section-desc">
              ทุกฟีเจอร์เชื่อมกันเป็นวงจรเดียว ตั้งแต่บรีฟจนถึงคลังพรอมป์ของทีม
              ไม่ต้องเปิดเครื่องมือหลายตัวหรือจำ syntax คนละชุด
            </p>
          </div>

          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-top">
                  <feature.icon size={22} strokeWidth={1.5} />
                  <span>{feature.no}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section demo-section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                03 / LIVE DEMO
              </div>
              <h2 className="section-title">
                ลองเปลี่ยนสามตัวแปร
                <br />
                แล้วดูพรอมป์<span className="accent">เปลี่ยนทันที</span>
              </h2>
            </div>
            <p className="section-desc">
              นี่คือ engine ตัวจริงที่ทำงานในเบราว์เซอร์ เลือกแนวภาพ แสง และพาเลตต์
              แล้วส่งค่าต่อไปที่ Studio เพื่อปรับรายละเอียดทั้งหมด
            </p>
          </div>

          <div className="demo-shell">
            <div className="demo-controls">
              <div className="demo-field">
                <span className="field-label">แนวภาพ</span>
                <div className="chip-group">
                  {STYLES.slice(0, 5).map((style) => (
                    <button
                      type="button"
                      key={style.id}
                      className={`chip${demoStyle === style.id ? ' is-active' : ''}`}
                      onClick={() => setDemoStyle(style.id)}
                    >
                      {style.th}
                    </button>
                  ))}
                </div>
              </div>
              <div className="demo-field">
                <span className="field-label">แสง</span>
                <div className="chip-group">
                  {LIGHTINGS.slice(0, 4).map((light) => (
                    <button
                      type="button"
                      key={light.id}
                      className={`chip${demoLight === light.id ? ' is-active' : ''}`}
                      onClick={() => setDemoLight(light.id)}
                    >
                      {light.th}
                    </button>
                  ))}
                </div>
              </div>
              <div className="demo-field">
                <span className="field-label">พาเลตต์</span>
                <div className="chip-group">
                  {PALETTES.slice(0, 4).map((palette) => (
                    <button
                      type="button"
                      key={palette.id}
                      className={`chip chip-palette${demoPalette === palette.id ? ' is-active' : ''}`}
                      onClick={() => setDemoPalette(palette.id)}
                    >
                      <span className="palette-dots">
                        {palette.swatch?.slice(0, 3).map((color) => (
                          <i key={color} style={{ background: color }} />
                        ))}
                      </span>
                      {palette.th}
                    </button>
                  ))}
                </div>
              </div>

              <div className="demo-brief">
                <span className="field-label">บรีฟตัวอย่าง</span>
                <p>{EXAMPLE_BRIEF}</p>
                <span className="demo-brief-meta">
                  {demoResult.toolName} · {demoResult.input.aspect} · {demoResult.variations.length} routes
                </span>
              </div>

              <button type="button" className="btn btn-dark" onClick={openInStudio}>
                เปิดค่าชุดนี้ใน Studio
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="demo-output">
              <div className="demo-output-head">
                <span className="status-dot" /> LIVE OUTPUT
                <span className="demo-out-tool">{demoResult.parameterLine}</span>
              </div>
              <pre>{demoResult.toolPrompt}</pre>
              <div className="demo-output-foot">
                <span>master prompt · 3 routes · checklist</span>
                <button type="button" className="text-btn" onClick={openInStudio}>
                  ปรับต่อ <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section direction-section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                04 / DIRECTIONS
              </div>
              <h2 className="section-title">
                หกทิศทางภาพ
                <br />
                ที่<span className="mark">หยิบไปใช้ได้</span>ทันที
              </h2>
            </div>
            <p className="section-desc">
              แต่ละการ์ดคือชุดค่าที่ผ่านการทดสอบกับงานจริง — กดเพื่อเปิดใน Studio
              พร้อมสไตล์นั้น แล้วปรับแบรนด์และข้อห้ามต่อได้ทันที
            </p>
          </div>

          <div className="direction-grid">
            {STYLES.slice(0, 6).map((style, index) => (
              <button
                type="button"
                className="direction-card"
                key={style.id}
                onClick={() => openStyle(style.id)}
              >
                <ArtTile
                  swatch={style.swatch ?? ['#e8ded2', '#8c3b2e', '#2f2a26']}
                  ratio="square"
                  index={`0${index + 1}`}
                  seed={`direction-${style.id}`}
                  className="direction-art"
                />
                <span className="direction-copy">
                  <strong>{style.th}</strong>
                  <em>{style.en}</em>
                  <span>{style.desc}</span>
                </span>
                <ArrowUpRight size={16} className="direction-go" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                05 / STARTING POINTS
              </div>
              <h2 className="section-title">
                เริ่มจากเทมเพลต
                <br />
                ที่ใกล้กับ<span className="underline-accent">งานจริง</span>
              </h2>
            </div>
            <Link to="/templates" className="btn btn-line">
              ดูทั้งหมด {TEMPLATES.length} เทมเพลต
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="template-grid home-templates">
            {TEMPLATES.filter((template) => template.featured)
              .slice(0, 4)
              .map((template, index) => (
                <Link
                  to={`/studio?template=${template.id}`}
                  className="template-card"
                  key={template.id}
                >
                  <ArtTile
                    swatch={template.swatch}
                    ratio="wide"
                    index={`0${index + 1}`}
                    className="template-art"
                  />
                  <div className="template-body">
                    <span className="template-tag">{template.tag}</span>
                    <h3>{template.title}</h3>
                    <p>{template.description}</p>
                    <span className="template-cta">
                      ใช้เทมเพลตนี้ <ArrowUpRight size={15} />
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                06 / WORKFLOW
              </div>
              <h2 className="section-title">
                สี่ขั้นตอน
                <br />
                จากบรีฟถึง<span className="accent">ไฟล์ส่งต่อ</span>
              </h2>
            </div>
            <p className="section-desc">
              ไม่ต้องจำลำดับเอง ระบบพาไปทีละขั้น พร้อมเตือนเมื่อข้อมูลสำคัญยังขาด
              และเก็บทุกเวอร์ชันไว้ให้ย้อนดูได้
            </p>
          </div>

          <div className="workflow-grid">
            {WORKFLOW.map((step) => (
              <article className="workflow-step" key={step.no}>
                <span className="workflow-no">{step.no}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="quote-section">
        <div className="container quote-inner">
          <span className="quote-mark">“</span>
          <blockquote>
            งานอาร์ตไดเรกชันที่ดีไม่ใช่การหาภาพสวยหนึ่งใบ
            แต่คือการทำให้คนทั้งทีมเห็นภาพเดียวกันได้โดยไม่ต้องอธิบายซ้ำ
          </blockquote>
          <div className="quote-foot">
            <span>PROMPTROOM / PRINCIPLE 01</span>
            <span>BRIEF → DIRECTION → SYSTEM → DELIVERY</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container faq-wrap">
          <div className="faq-intro">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              07 / FAQ
            </div>
            <h2 className="section-title">คำถามที่พบบ่อย</h2>
            <p className="section-desc">
              ถ้ายังมีคำถามอื่น เปิด Control Center เพื่อดูสถานะเซิร์ฟเวอร์และบันทึกระบบได้ทุกเมื่อ
            </p>
          </div>
          <div className="faq-list">
            {FAQ.map((item, index) => (
              <details key={item.q} className="faq-item" open={index === 0}>
                <summary>
                  <span className="faq-no">0{index + 1}</span>
                  {item.q}
                  <Plus size={17} className="faq-plus" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <span className="eyebrow eyebrow-dark">READY WHEN YOU ARE</span>
            <h2>
              บรีฟใบต่อไป
              <br />
              เริ่มจาก<span className="cta-mark">ระบบ</span>
            </h2>
          </div>
          <div className="cta-side">
            <p>ไม่ต้องสมัคร ไม่ต้องจำ syntax เปิด Studio แล้วสร้างพรอมป์แรกได้ในสองนาที</p>
            <Link to="/studio" className="btn btn-black btn-lg">
              เข้า Studio
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
