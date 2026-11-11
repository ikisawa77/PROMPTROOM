import type { CSSProperties } from 'react'
import type { GenerateResult } from '../../shared/types'

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

export function downloadText(filename: string, content: string, type = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function shortDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

export function artBackground(swatch: string[]): CSSProperties {
  const colors = swatch.length >= 3 ? swatch : ['#e8ded2', '#8c3b2e', '#2f2a26']
  return {
    backgroundImage: [
      `radial-gradient(120% 100% at 18% 8%, ${colors[0]} 0%, transparent 58%)`,
      `radial-gradient(90% 70% at 85% 20%, ${colors[1]}88 0%, transparent 55%)`,
      `linear-gradient(145deg, ${colors[1]} 0%, ${colors[0]} 38%, ${colors[2]} 100%)`,
    ].join(', '),
  }
}

export function resultToMarkdown(result: GenerateResult): string {
  const series =
    result.series.length > 0
      ? [
          '## ตารางซีรีส์',
          '| ลำดับ | Beat | ฉาก | แอ็กชัน | เฟรม | เลนส์ |',
          '| --- | --- | --- | --- | --- | --- |',
          ...result.series.map(
            (row) => `| ${row.no} | ${row.beat} | ${row.scene} | ${row.action} | ${row.framing} | ${row.lens} |`,
          ),
          '',
        ].join('\n')
      : ''

  const shots =
    result.shots.length > 0
      ? [
          '## Shot list',
          '| ช็อต | เวลา | ภาพ | กล้อง | เลนส์ |',
          '| --- | --- | --- | --- | --- |',
          ...result.shots.map(
            (row) => `| ${row.no} | ${row.time} | ${row.action} | ${row.camera} | ${row.lens} |`,
          ),
          '',
        ].join('\n')
      : ''

  const variations = result.variations
    .map(
      (variant) =>
        `### ${variant.name} (${variant.nameEn})\n${variant.angle}\n\n\`\`\`\n${variant.prompt}\n\`\`\`\n`,
    )
    .join('\n')

  return [
    `# ${result.title}`,
    '',
    result.summary,
    '',
    `สร้างเมื่อ ${formatDate(result.createdAt)}`,
    '',
    '## Master prompt',
    '```',
    result.masterPrompt,
    '```',
    '',
    '## พรอมป์พร้อมใช้',
    '```',
    result.toolPrompt,
    '```',
    '',
    '## Negative prompt',
    '```',
    result.negativePrompt,
    '```',
    '',
    series,
    shots,
    '## เส้นทางเลือก',
    variations,
    '## Checklist',
    ...result.checks.map((item) => `- ${item}`),
    '',
    '## โน้ตเครื่องมือ',
    ...result.toolNotes.map((item) => `- ${item}`),
  ]
    .filter(Boolean)
    .join('\n')
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'promptroom'
  )
}

function csvCell(value: unknown): string {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""')
  return `"${text}"`
}

export function resultToCsv(result: GenerateResult): string {
  if (result.shots.length > 0) {
    return [
      ['shot', 'time', 'action', 'camera', 'lens'],
      ...result.shots.map((row) => [row.no, row.time, row.action, row.camera, row.lens]),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  }
  return [
    ['no', 'beat', 'scene', 'action', 'framing', 'lens'],
    ...result.series.map((row) => [row.no, row.beat, row.scene, row.action, row.framing, row.lens]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')
}

export function resultToText(result: GenerateResult): string {
  return [
    result.title,
    '='.repeat(Math.min(result.title.length, 60)),
    '',
    result.summary,
    '',
    '[ MASTER PROMPT ]',
    result.masterPrompt,
    '',
    '[ TOOL PROMPT ]',
    result.toolPrompt,
    '',
    '[ NEGATIVE ]',
    result.negativePrompt,
    '',
    '[ CHECKLIST ]',
    ...result.checks.map((item) => `- ${item}`),
  ].join('\n')
}

export function copyLink(path: string): Promise<boolean> {
  return copyText(`${window.location.origin}${path}`)
}

