import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowUpRight, Check, CircleAlert, Copy } from 'lucide-react'
import { TOOLS } from '../../shared/options'
import { EXAMPLE_MASTER } from '../../shared/examples'
import { useToast } from '../components/Toast'
import { copyText } from '../lib/utils'
import ToolIcon from '../components/ToolIcon'

const SECTIONS = [
  { id: 'principle', label: 'หลักคิด' },
  { id: 'six', label: '6 องค์ประกอบ' },
  { id: 'tools', label: 'Cheat sheet' },
  { id: 'mistakes', label: 'ข้อผิดพลาด' },
  { id: 'example', label: 'ตัวอย่างจริง' },
  { id: 'checklist', label: 'Checklist' },
]

const SIX = [
  {
    no: '01',
    title: 'Subject — สิ่งที่เห็น',
    text: 'ระบุสิ่งหลัก วัสดุ สถานะ และรายละเอียดที่ทำให้ภาพนี้ไม่เหมือนภาพอื่น หลีกเลี่ยงการบอกเพียง "ผู้หญิงสวย" เพราะโมเดลต้องเดาทุกอย่างแทนคุณ',
    example: 'เซรั่มในขวดแก้วอำพันวางบนหินทราย มีหยดน้ำเกาะที่ผิวแก้ว',
  },
  {
    no: '02',
    title: 'Direction — ทิศทางศิลปะ',
    text: 'บอกแนวภาพและตรรกะของการจัดวาง เช่น editorial, minimal หรือ cinematic พร้อมระบุว่าอะไรคือสิ่งที่ทำให้ภาพดูเป็นแบรนด์นี้',
    example: 'editorial still life, restrained styling, matte film grain',
  },
  {
    no: '03',
    title: 'Light — แสง',
    text: 'แสงคือตัวกำหนดอารมณ์ที่ทรงพลังที่สุด ระบุทิศทาง ความนุ่ม และเงา เช่น soft window light จากด้านซ้าย หรือ hard noon sun',
    example: 'soft directional window light, gentle falloff, long shadow to the right',
  },
  {
    no: '04',
    title: 'Palette — สี',
    text: 'กำหนดสีเป็นกลุ่มความสัมพันธ์ ไม่ใช่แค่รายการสี ระบุอุณหภูมิและระดับความอิ่มตัว จะช่วยให้ซีรีส์คุมโทนได้ง่าย',
    example: 'warm earth palette: terracotta, sand, olive, deep brown',
  },
  {
    no: '05',
    title: 'Lens & Format — เลนส์และสัดส่วน',
    text: 'เลนส์เปลี่ยนความรู้สึกของระยะและสัดส่วน อัตราส่วนเปลี่ยนวิธีครอป ระบุทั้งคู่เพื่อให้ภาพพร้อมใช้จริงในสื่อ',
    example: '100mm macro, 4:5, negative space at the top for headline',
  },
  {
    no: '06',
    title: 'Constraints — ข้อจำกัด',
    text: 'บอกสิ่งที่ห้ามเกิดและสิ่งที่ต้องคงที่ เช่น ห้ามตัวอักษรในภาพ ห้ามผิวพลาสติก ต้องเห็นโลโก้ชัด หรือต้องคงสีสินค้า',
    example: 'no text, no plastic skin, keep bottle label legible, no extra props',
  },
]

const MISTAKES = [
  ['ใส่คำคุณศัพท์ที่วัดไม่ได้', 'beautiful, amazing, masterpiece, 8k ไม่ได้บอกทิศทางให้โมเดล ลองเปลี่ยนเป็นวัสดุ แสง และองค์ประกอบที่วัดได้'],
  ['อ้างชื่อศิลปินที่มีชีวิต', 'ทั้งเรื่องสิทธิ์และความแม่นยำ ให้บรรยายคุณสมบัติของภาพแทนชื่อศิลปิน'],
  ['ยัดทุกอย่างในพรอมป์เดียว', 'พรอมป์ที่ดีคือพรอมป์ที่ตัดสินใจได้ เปลี่ยนทีละตัวแปรและบันทึกเวอร์ชัน'],
  ['ลืม negative และ continuity', 'โดยเฉพาะซีรีส์และวิดีโอ ต้องระบุสิ่งที่ต้องคงที่และสิ่งที่ไม่ต้องการให้เกิด'],
  ['ไม่ตรวจสิทธิ์ของ reference', 'reference ใช้เป็นแนวทางได้ แต่การลอกองค์ประกอบหรือตัวตนของศิลปินเป็นความเสี่ยงทางกฎหมาย'],
]

export default function Guide() {
  const { show } = useToast()
  const [active, setActive] = useState('principle')
  const [copied, setCopied] = useState(false)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const sections = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (node): node is HTMLElement => Boolean(node),
    )
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) setActive(visible[0].target.id)
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.4, 1] },
    )
    sections.forEach((section) => observer.observe(section))

    const onScroll = () => setShowTop(window.scrollY > 640)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const copyExample = async () => {
    const ok = await copyText(EXAMPLE_MASTER)
    setCopied(ok)
    if (ok) window.setTimeout(() => setCopied(false), 1800)
    show(ok ? 'คัดลอกตัวอย่าง Master prompt แล้ว' : 'คัดลอกไม่สำเร็จ', ok ? 'success' : 'error')
  }

  return (
    <div className="page guide-page">
      <div className="container">
        <div className="page-head">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              GUIDE / PROMPTING FOR ART DIRECTION
            </div>
            <h1 className="page-title">
              พรอมป์ที่ดี
              <br />
              คือ<span className="accent">บรีฟที่วัดได้</span>
            </h1>
            <p className="page-desc">
              คู่มือสั้น ๆ สำหรับทีมครีเอทีฟไทย: วิธีคิดหกองค์ประกอบ ความต่างของแต่ละเครื่องมือ
              ข้อผิดพลาดที่พบบ่อย และ Checklist ก่อนส่งงาน
            </p>
          </div>
          <div className="page-head-actions">
            <Link to="/studio" className="btn btn-dark">
              ลองใช้กับงานจริง <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        <div className="guide-layout">
          <aside className="guide-toc">
            <span className="eyebrow">สารบัญ</span>
            {SECTIONS.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={active === section.id ? 'is-active' : ''}
                aria-current={active === section.id ? 'true' : undefined}
              >
                <span>0{index + 1}</span>
                {section.label}
              </a>
            ))}
            <div className="guide-toc-progress" aria-hidden="true">
              <span
                style={{
                  height: `${((SECTIONS.findIndex((section) => section.id === active) + 1) / SECTIONS.length) * 100}%`,
                }}
              />
            </div>
            <div className="guide-toc-cta">
              <p>อยากเห็นระบบทำงานจริง?</p>
              <Link to="/studio" className="text-link">
                เปิด Studio <ArrowUpRight size={13} />
              </Link>
            </div>
          </aside>

          <div className="guide-content">
            <section id="principle" className="guide-section">
              <span className="guide-kicker">01 / PRINCIPLE</span>
              <h2>พรอมป์ไม่ใช่คาถา แต่คือเอกสารกำกับภาพ</h2>
              <p>
                เมื่อทีมถ่ายภาพ receives บรีฟที่ดี เขาจะรู้ว่าต้องเตรียมอะไร ใช้เลนส์ไหน และแสงแบบไหน
                พรอมป์ก็เช่นกัน — ยิ่งระบุสิ่งที่วัดได้มากเท่าไร ผลลัพธ์ก็ยิ่งคาดเดาได้
                และเมื่อผลไม่ตรง เราก็รู้ว่าต้องแก้ที่ตัวแปรไหน
              </p>
              <p>
                หลักง่าย ๆ คือ: <strong>บอกคุณสมบัติ ไม่ใช่คำชม</strong> และ <strong>แยกสิ่งที่ต้องคงที่ออกจากสิ่งที่เปลี่ยน</strong>
                ทุกครั้งที่วนซ้ำ ให้เปลี่ยนเพียงหนึ่งตัวแปรและบันทึกไว้
              </p>
              <div className="guide-callout">
                <span>นิยามสั้น ๆ</span>
                <p>
                  พรอมป์สำหรับอาร์ตไดเรกชัน = Subject + Direction + Light + Palette + Lens/Format + Constraints
                  เรียงตามลำดับความสำคัญของสิ่งที่โมเดลต้องรู้
                </p>
              </div>
            </section>

            <section id="six" className="guide-section">
              <span className="guide-kicker">02 / SIX ELEMENTS</span>
              <h2>หกองค์ประกอบที่ควรมีในทุกพรอมป์</h2>
              <div className="guide-six">
                {SIX.map((item) => (
                  <article key={item.no}>
                    <span>{item.no}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <code>{item.example}</code>
                  </article>
                ))}
              </div>
            </section>

            <section id="tools" className="guide-section">
              <span className="guide-kicker">03 / TOOL CHEAT SHEET</span>
              <h2>แต่ละเครื่องมือกินพรอมป์ไม่เหมือนกัน</h2>
              <p>
                กฎสำคัญคืออย่าเอา syntax ของเครื่องมือหนึ่งไปใส่ในอีกเครื่องมือ
                ตารางนี้สรุปจุดที่ต้องระวังเมื่อต้องส่งงานข้ามเครื่องมือ
              </p>
              <div className="guide-table-wrap">
                <table className="guide-table">
                  <thead>
                    <tr>
                      <th>เครื่องมือ</th>
                      <th>เหมาะกับ</th>
                      <th>สิ่งที่ต้องระวัง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOOLS.map((tool) => (
                      <tr key={tool.id}>
                        <td>
                          <span className="guide-tool">
                            <ToolIcon id={tool.id} size={22} />
                            <strong>{tool.name}</strong>
                          </span>
                        </td>
                        <td>{tool.best}</td>
                        <td>{tool.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="mistakes" className="guide-section">
              <span className="guide-kicker">04 / COMMON MISTAKES</span>
              <h2>ห้าข้อผิดพลาดที่ทำให้ภาพไม่ตรงบรีฟ</h2>
              <div className="mistake-list">
                {MISTAKES.map(([title, text], index) => (
                  <article key={title}>
                    <span className="mistake-no">0{index + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                    <CircleAlert size={18} />
                  </article>
                ))}
              </div>
            </section>

            <section id="example" className="guide-section">
              <span className="guide-kicker">05 / REAL EXAMPLE</span>
              <h2>ตัวอย่าง Master prompt</h2>
              <p>
                นี่คือโครงที่ Studio สร้างให้ โดยย่อมาจากงานจริง นำไปวางใน ChatGPT หรือ Claude
                เพื่อให้ช่วยแตกพรอมป์รายเครื่องมือได้ทันที
              </p>
              <div className="guide-code-head">
                <span className="pop-kicker">MASTER PROMPT / SAMPLE</span>
                <button type="button" className={`text-btn${copied ? ' is-done' : ''}`} onClick={copyExample}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'คัดลอกแล้ว' : 'คัดลอกตัวอย่าง'}
                </button>
              </div>
              <pre className="guide-code">{EXAMPLE_MASTER}</pre>
              <p className="guide-note">
                สังเกตว่าทุกส่วนมีเหตุผล: แบรนด์ กลุ่มเป้าหมาย แนวภาพ ข้อจำกัด และรูปแบบผลลัพธ์
                ไม่มีคำว่า “สวย” หรือ “มืออาชีพ” ที่ตรวจสอบไม่ได้
              </p>
            </section>

            <section id="checklist" className="guide-section">
              <span className="guide-kicker">06 / PRE-FLIGHT CHECKLIST</span>
              <h2>ก่อนกดสร้าง ตรวจหกข้อนี้</h2>
              <ul className="guide-checklist">
                <li>
                  <Check size={15} /> บรีฟระบุสิ่งที่เห็น วัสดุ และสถานที่ ไม่ใช่แค่อารมณ์
                </li>
                <li>
                  <Check size={15} /> มีกลุ่มเป้าหมายและสารหลักที่คนควรจำได้
                </li>
                <li>
                  <Check size={15} /> เลือกเครื่องมือปลายทางถูกกลุ่ม (ภาพนิ่ง vs วิดีโอ)
                </li>
                <li>
                  <Check size={15} /> อัตราส่วนตรงกับสื่อที่จะใช้จริง และเผื่อพื้นที่ข้อความ
                </li>
                <li>
                  <Check size={15} /> มีข้อห้าม/negative ที่เฉพาะกับงาน ไม่ใช่ลิสต์ยาว ๆ
                </li>
                <li>
                  <Check size={15} /> reference มีที่มาและสิทธิ์ชัดเจน
                </li>
              </ul>
              <div className="guide-cta">
                <div>
                  <h3>พร้อมเริ่มแล้วหรือยัง?</h3>
                  <p>เปิด Studio แล้วสร้างพรอมป์แรกจากบรีฟของคุณเอง</p>
                </div>
                <Link to="/studio" className="btn btn-accent">
                  เปิด Studio <ArrowUpRight size={16} />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`back-to-top${showTop ? ' is-visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="กลับขึ้นด้านบน"
      >
        <ArrowUp size={16} />
      </button>
    </div>
  )
}
