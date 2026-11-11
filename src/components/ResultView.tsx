import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Braces,
  Check,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Route,
  Sparkles,
  Table2,
  Wrench,
} from 'lucide-react'
import type { GenerateResult } from '../../shared/types'
import { findTask, findTool, STYLES } from '../../shared/options'
import {
  copyText,
  downloadText,
  formatDate,
  resultToCsv,
  resultToMarkdown,
  resultToText,
  slugify,
} from '../lib/utils'
import { useToast } from './Toast'
import Popover from './ui/Popover'
import ToolIcon from './ToolIcon'

type TabId = 'master' | 'tool' | 'routes' | 'table' | 'checks' | 'json'

interface Props {
  result: GenerateResult
  boosted?: string
  onBoost?: () => void
  boosting?: boolean
  aiEnabled?: boolean
  variant?: 'studio' | 'modal'
  savedId?: string
  onShare?: () => void
}

const TAB_ICONS: Record<TabId, typeof FileText> = {
  master: FileText,
  tool: Wrench,
  routes: Route,
  table: Table2,
  checks: ListChecks,
  json: Braces,
}

export default function ResultView({
  result,
  boosted,
  onBoost,
  boosting = false,
  aiEnabled = false,
  variant = 'studio',
  savedId,
  onShare,
}: Props) {
  const { show } = useToast()
  const [tab, setTab] = useState<TabId>('master')
  const [toolLang, setToolLang] = useState<'en' | 'th'>('en')
  const [showOriginal, setShowOriginal] = useState(false)
  const [copied, setCopied] = useState('')

  const task = findTask(result.task)
  const tool = findTool(result.tool)
  const style = STYLES.find((item) => item.id === result.style)
  const hasTable = result.series.length > 0 || result.shots.length > 0

  const tabs = useMemo(
    () =>
      [
        { id: 'master' as TabId, label: 'Master prompt' },
        { id: 'tool' as TabId, label: 'พร้อมใช้' },
        { id: 'routes' as TabId, label: `${result.variations.length} เส้นทาง` },
        ...(hasTable ? [{ id: 'table' as TabId, label: result.shots.length ? 'Shot list' : 'ตารางซีรีส์' }] : []),
        { id: 'checks' as TabId, label: 'Checklist' },
        { id: 'json' as TabId, label: 'JSON' },
      ] as Array<{ id: TabId; label: string }>,
    [hasTable, result.shots.length, result.variations.length],
  )

  const toolText = showOriginal || !boosted ? (toolLang === 'en' ? result.toolPrompt : result.toolPromptTh) : boosted
  const actualToolPrompt = toolLang === 'en' ? result.toolPrompt : result.toolPromptTh

  const copy = async (text: string, message: string, key = '') => {
    const ok = await copyText(text)
    if (ok && key) {
      setCopied(key)
      window.setTimeout(() => setCopied(''), 1600)
    }
    show(ok ? message : 'คัดลอกไม่สำเร็จ กรุณาเลือกข้อความด้วยตนเอง', ok ? 'success' : 'error')
  }

  const currentText = () => {
    switch (tab) {
      case 'master':
        return result.masterPrompt
      case 'tool':
        return toolText
      case 'routes':
        return result.variations.map((item) => `${item.name}\n${item.prompt}`).join('\n\n')
      case 'table':
        return result.shots.length
          ? result.shots.map((row) => `${row.no}. ${row.time} — ${row.action} (${row.camera})`).join('\n')
          : result.series.map((row) => `${row.no}. ${row.beat} — ${row.scene} | ${row.framing} | ${row.lens}`).join('\n')
      case 'checks':
        return result.checks.map((item) => `- ${item}`).join('\n')
      default:
        return JSON.stringify(result, null, 2)
    }
  }

  const copyCurrent = () => {
    const labels: Record<TabId, string> = {
      master: 'คัดลอก Master prompt แล้ว',
      tool: 'คัดลอกพรอมป์พร้อมใช้แล้ว',
      routes: 'คัดลอกทุกเส้นทางแล้ว',
      table: 'คัดลอกตารางแล้ว',
      checks: 'คัดลอก Checklist แล้ว',
      json: 'คัดลอก JSON แล้ว',
    }
    return copy(currentText(), labels[tab], tab)
  }

  const exportAs = (kind: 'md' | 'json' | 'csv' | 'txt') => {
    const base = `promptroom-${slugify(result.title)}`
    if (kind === 'md') downloadText(`${base}.md`, resultToMarkdown(result))
    if (kind === 'json') downloadText(`${base}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')
    if (kind === 'csv') downloadText(`${base}-shots.csv`, `\ufeff${resultToCsv(result)}`, 'text/csv;charset=utf-8')
    if (kind === 'txt') downloadText(`${base}.txt`, resultToText(result), 'text/plain;charset=utf-8')
    show(`ดาวน์โหลด ${kind.toUpperCase()} แล้ว`, 'success')
  }

  const onTabKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((item) => item.id === tab)
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setTab(tabs[(index + 1) % tabs.length].id)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setTab(tabs[(index - 1 + tabs.length) % tabs.length].id)
    }
  }

  return (
    <div className={`result result-${variant}`}>
      <div className="result-top">
        <div className="result-title-row">
          <div className="result-title-main">
            <ToolIcon id={result.tool} size={38} className="result-tool-icon" />
            <div>
              <span className="result-kicker">
                {savedId ? 'SAVED TO LIBRARY' : 'GENERATED'} · {task.short.toUpperCase()}
              </span>
              <h3 className="result-title">{result.title}</h3>
            </div>
          </div>
          <div className="result-meta">
            <span>{tool.name}</span>
            <span>{style?.th ?? result.style}</span>
            <span>{result.input.aspect}</span>
          </div>
        </div>

        <div className="result-tabs" role="tablist" aria-label="ผลลัพธ์พรอมป์" onKeyDown={onTabKey}>
          {tabs.map((item) => {
            const Icon = TAB_ICONS[item.id]
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                tabIndex={tab === item.id ? 0 : -1}
                className={tab === item.id ? 'is-active' : ''}
                onClick={() => setTab(item.id)}
              >
                <Icon size={12.5} />
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="result-toolbar">
          <span className="result-date">สร้าง {formatDate(result.createdAt)}</span>
          <div className="result-actions">
            {onShare && (
              <button type="button" className="tool-btn" onClick={onShare} title="คัดลอกลิงก์แชร์พรอมป์">
                <ArrowUpRight size={13} />
                แชร์
              </button>
            )}
            <button
              type="button"
              className={`tool-btn${copied === tab ? ' is-done' : ''}`}
              onClick={copyCurrent}
            >
              {copied === tab ? <Check size={13} /> : <Copy size={13} />}
              {copied === tab ? 'คัดลอกแล้ว' : 'คัดลอกแท็บนี้'}
            </button>
            <Popover
              label="ดาวน์โหลดพรอมป์"
              align="end"
              width={248}
              className="export-pop"
              trigger={(props) => (
                <button type="button" className="tool-btn" {...props}>
                  <Download size={13} />
                  ดาวน์โหลด
                </button>
              )}
            >
              {(close) => (
                <div className="export-menu">
                  <span className="pop-kicker">EXPORT</span>
                  <button
                    type="button"
                    onClick={() => {
                      exportAs('md')
                      close()
                    }}
                  >
                    <FileText size={15} />
                    <span>
                      <strong>Markdown</strong>
                      <em>เอกสารส่งต่อทีม · .md</em>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportAs('json')
                      close()
                    }}
                  >
                    <FileJson size={15} />
                    <span>
                      <strong>JSON</strong>
                      <em>ข้อมูลเต็มสำหรับเชื่อมระบบ</em>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!hasTable}
                    onClick={() => {
                      exportAs('csv')
                      close()
                    }}
                  >
                    <FileSpreadsheet size={15} />
                    <span>
                      <strong>CSV shot list</strong>
                      <em>{hasTable ? 'เปิดใน Excel / Sheets' : 'งานนี้ไม่มีตาราง'}</em>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportAs('txt')
                      close()
                    }}
                  >
                    <FileText size={15} />
                    <span>
                      <strong>Plain text</strong>
                      <em>คัดลอกไปวางที่อื่นได้ทันที</em>
                    </span>
                  </button>
                </div>
              )}
            </Popover>
          </div>
        </div>
      </div>

      <div className="result-body">
        {tab === 'master' && (
          <div className="result-section">
            <p className="result-hint">
              วางบล็อกนี้ใน ChatGPT / Claude / Gemini เพื่อให้ AI เขียนพรอมป์ฉบับผลิตจริงตามระบบที่กำหนด
              หรือใช้เป็นเอกสารส่งต่อให้ทีมก็ได้
            </p>
            <pre className="code-block tall">{result.masterPrompt}</pre>
          </div>
        )}

        {tab === 'tool' && (
          <div className="result-section">
            <div className="tool-lang-row">
              <div className="mini-toggle">
                <button
                  type="button"
                  className={toolLang === 'en' ? 'is-active' : ''}
                  onClick={() => {
                    setToolLang('en')
                    setShowOriginal(false)
                  }}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={toolLang === 'th' ? 'is-active' : ''}
                  onClick={() => {
                    setToolLang('th')
                    setShowOriginal(false)
                  }}
                >
                  ไทย
                </button>
              </div>
              {boosted && (
                <button type="button" className="text-btn" onClick={() => setShowOriginal((value) => !value)}>
                  {showOriginal ? 'ดูฉบับ AI Boost' : 'ดูฉบับต้นฉบับ'}
                </button>
              )}
              <span className="tool-param">{result.parameterLine}</span>
            </div>

            {boosted && !showOriginal && (
              <div className="boost-badge">
                <Sparkles size={13} /> AI Boost · ปรับภาษาและรายละเอียดแล้ว
              </div>
            )}
            <pre className="code-block">{toolText}</pre>

            <div className="inline-actions">
              <button
                type="button"
                className={`btn btn-ghost btn-sm onboard-dark${copied === 'tool-inline' ? ' is-done' : ''}`}
                onClick={() => copy(toolText, 'คัดลอกพรอมป์พร้อมใช้แล้ว', 'tool-inline')}
              >
                {copied === 'tool-inline' ? <Check size={14} /> : <Copy size={14} />}
                {copied === 'tool-inline' ? 'คัดลอกแล้ว' : 'คัดลอกพรอมป์'}
              </button>
              {onBoost && (
                <button
                  type="button"
                  className="btn btn-lime btn-sm"
                  onClick={onBoost}
                  disabled={boosting || !aiEnabled}
                  title={
                    aiEnabled
                      ? 'ใช้ LLM ปรับพรอมป์ให้เป็นภาษาอังกฤษธรรมชาติ'
                      : 'ต้องตั้งค่า OPENAI_API_KEY ใน .env ก่อน — ตอนนี้ใช้พรอมป์ต้นฉบับได้ปกติ'
                  }
                >
                  <Sparkles size={14} />
                  {boosting ? 'กำลังปรับ…' : aiEnabled ? 'AI Boost' : 'AI Boost (ยังไม่เปิด)'}
                </button>
              )}
              <span className="inline-hint">ต้นฉบับยังใช้ได้เสมอ แม้ AI Boost ล้มเหลว</span>
            </div>

            {boosted && toolLang === 'en' && boosted !== actualToolPrompt && (
              <p className="boost-diff-note">
                ฉบับ AI Boost ต่างจากต้นฉบับ — เทียบได้ด้วยปุ่ม “ดูฉบับต้นฉบับ” ด้านบน
              </p>
            )}

            <div className="negative-block">
              <div className="negative-head">
                <span>Negative prompt</span>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => copy(result.negativePrompt, 'คัดลอก Negative prompt แล้ว')}
                >
                  <Copy size={12} /> คัดลอก
                </button>
              </div>
              <p>{result.negativePrompt}</p>
            </div>

            <div className="tool-note-list">
              {result.toolNotes.map((note) => (
                <p key={note}>
                  <ArrowUpRight size={13} />
                  {note}
                </p>
              ))}
            </div>
          </div>
        )}

        {tab === 'routes' && (
          <div className="routes-list">
            {result.variations.map((variation, index) => (
              <article className="route-card" key={variation.id}>
                <header>
                  <span className="route-index">0{index + 1}</span>
                  <div>
                    <h4>{variation.name}</h4>
                    <span className="route-en">{variation.nameEn}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`คัดลอก ${variation.name}`}
                    onClick={() => copy(variation.prompt, `คัดลอก ${variation.nameEn} แล้ว`, variation.id)}
                  >
                    {copied === variation.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </header>
                <p className="route-angle">{variation.angle}</p>
                <p className="route-when">
                  <strong>ใช้เมื่อ</strong> {variation.when}
                </p>
                <pre className="code-block compact">{variation.prompt}</pre>
              </article>
            ))}
          </div>
        )}

        {tab === 'table' && (
          <div className="result-section">
            {result.shots.length > 0 ? (
              <>
                <p className="result-hint">
                  Shot list สำหรับ {result.input.duration} วินาที · ใช้เป็นโครงแล้วสร้างพรอมป์รายช็อตแยกกัน
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>เวลา</th>
                        <th>ภาพ</th>
                        <th>กล้อง</th>
                        <th>เลนส์</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.shots.map((row) => (
                        <tr key={row.no}>
                          <td>{String(row.no).padStart(2, '0')}</td>
                          <td>{row.time}</td>
                          <td>{row.action}</td>
                          <td>{row.camera}</td>
                          <td>{row.lens}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <p className="result-hint">
                  Fixed Block: ตัวละคร/สินค้า พาเลตต์ และแสงต้องเหมือนเดิมทุกภาพ เปลี่ยนเฉพาะฉากและแอ็กชัน
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Beat</th>
                        <th>ฉาก</th>
                        <th>แอ็กชัน</th>
                        <th>เฟรม</th>
                        <th>เลนส์</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.series.map((row) => (
                        <tr key={row.no}>
                          <td>{String(row.no).padStart(2, '0')}</td>
                          <td>{row.beat}</td>
                          <td>{row.scene}</td>
                          <td>{row.action}</td>
                          <td>{row.framing}</td>
                          <td>{row.lens}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'checks' && (
          <div className="result-section">
            <div className="check-grid">
              {result.checks.map((item) => (
                <div className="check-item" key={item}>
                  <Check size={14} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <h4 className="result-subhead">เคล็ดลับการวนซ้ำ</h4>
            <ul className="tip-list">
              {result.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>

            <div className="keyword-row">
              {result.keywords.map((keyword) => (
                <span key={keyword}>#{keyword}</span>
              ))}
            </div>
          </div>
        )}

        {tab === 'json' && (
          <div className="result-section">
            <p className="result-hint">ข้อมูลทั้งหมดของพรอมป์นี้ ในรูปแบบ JSON สำหรับนำไปเชื่อมระบบอื่น</p>
            <pre className="code-block tall">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
