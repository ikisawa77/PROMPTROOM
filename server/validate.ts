import type { PromptInput } from '../shared/types'
import { normalizeInput } from './normalize'

/**
 * Error ที่ถูกแปลงเป็น JSON response โดย error handler กลาง
 */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function str(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function readGenerate(body: unknown): PromptInput {
  const payload = record(body)
  const raw = payload.input ?? payload
  if (raw !== null && raw !== undefined && typeof raw !== 'object') {
    throw new ApiError(400, 'รูปแบบข้อมูลไม่ถูกต้อง — ต้องส่ง input เป็น object')
  }
  const input = normalizeInput(raw)
  if (input.brief.length < 8) {
    throw new ApiError(400, 'กรุณาเขียนบรีฟอย่างน้อย 8 ตัวอักษร เพื่อให้ระบบมีข้อมูลพอ')
  }
  return input
}

export interface BrandPayload {
  name: string
  industry: string
  audience: string
  tone: string
  palette: string[]
  keywords: string
  avoid: string
}

const HEX = /^#?[0-9a-fA-F]{3,8}$/

export function normalizePalette(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const colors: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const color = entry.trim()
    if (!HEX.test(color)) continue
    const hex = color.startsWith('#') ? color : `#${color}`
    const key = hex.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    colors.push(hex)
    if (colors.length >= 8) break
  }
  return colors
}

export function readBrand(body: unknown, options: { partial?: boolean } = {}): Partial<BrandPayload> {
  const payload = record(body)
  const name = str(payload.name, 120)

  if (!options.partial && !name) {
    throw new ApiError(400, 'กรุณาตั้งชื่อแบรนด์ก่อนบันทึก')
  }
  if (options.partial && 'name' in payload && !name) {
    throw new ApiError(400, 'ชื่อแบรนด์ห้ามว่าง')
  }

  const patch: Partial<BrandPayload> = {}
  if (!options.partial || 'name' in payload) patch.name = name
  if (!options.partial || 'industry' in payload) patch.industry = str(payload.industry, 200)
  if (!options.partial || 'audience' in payload) patch.audience = str(payload.audience, 400)
  if (!options.partial || 'tone' in payload) patch.tone = str(payload.tone, 400)
  if (!options.partial || 'keywords' in payload) patch.keywords = str(payload.keywords, 600)
  if (!options.partial || 'avoid' in payload) patch.avoid = str(payload.avoid, 600)
  if (!options.partial || 'palette' in payload) patch.palette = normalizePalette(payload.palette)

  return patch
}

export interface BoostPayload {
  masterPrompt: string
  toolPrompt: string
  tool: string
  mode: 'translate' | 'enhance'
}

export function readBoost(body: unknown): BoostPayload {
  const payload = record(body)
  const masterPrompt = str(payload.masterPrompt, 12000)
  const toolPrompt = str(payload.toolPrompt, 8000)
  if (!toolPrompt) {
    throw new ApiError(400, 'ไม่มีพรอมป์ต้นทางให้ปรับ — กรุณาสร้างพรอมป์ก่อนใช้ AI Boost')
  }
  if (toolPrompt.length < 12) {
    throw new ApiError(400, 'พรอมป์ต้นทางสั้นเกินไปสำหรับการปรับภาษา')
  }
  return {
    masterPrompt,
    toolPrompt,
    tool: str(payload.tool, 40) || 'generic',
    mode: payload.mode === 'enhance' ? 'enhance' : 'translate',
  }
}

export function readPromptPatch(body: unknown): { favorite?: boolean; title?: string } {
  const payload = record(body)
  const patch: { favorite?: boolean; title?: string } = {}
  if (typeof payload.favorite === 'boolean') patch.favorite = payload.favorite
  if ('title' in payload) {
    const title = str(payload.title, 200)
    if (!title) throw new ApiError(400, 'ชื่อพรอมป์ห้ามว่าง')
    patch.title = title
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, 'ไม่มีข้อมูลที่ต้องอัปเดต — ส่ง favorite หรือ title อย่างน้อยหนึ่งค่า')
  }
  return patch
}

export function readLimit(value: unknown, fallback = 60, max = 200): number {
  const parsed = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.trunc(parsed), 1), max)
}
