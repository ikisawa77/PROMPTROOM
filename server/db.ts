import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { BrandKit, GenerateResult, PromptInput, PromptListItem, SavedPrompt, Stats } from '../shared/types'
import { generatePrompt } from '../shared/engine'
import { DEFAULT_INPUT } from '../shared/options'
import { TEMPLATES } from '../shared/templates'

const DATA_DIR = process.env.DATA_DIR || path.resolve('data')
fs.mkdirSync(DATA_DIR, { recursive: true })
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'promptroom.db')

export const db = new DatabaseSync(DB_PATH)

export function closeDatabase() {
  try {
    db.close()
  } catch {
    /* already closed */
  }
}

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    workspace TEXT NOT NULL DEFAULT 'demo',
    title TEXT NOT NULL,
    task TEXT NOT NULL,
    tool TEXT NOT NULL,
    style TEXT NOT NULL,
    brief TEXT NOT NULL,
    favorite INTEGER NOT NULL DEFAULT 0,
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_prompts_workspace ON prompts(workspace, created_at DESC);

  CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    workspace TEXT NOT NULL DEFAULT 'demo',
    name TEXT NOT NULL,
    industry TEXT NOT NULL DEFAULT '',
    audience TEXT NOT NULL DEFAULT '',
    tone TEXT NOT NULL DEFAULT '',
    palette_json TEXT NOT NULL DEFAULT '[]',
    keywords TEXT NOT NULL DEFAULT '',
    avoid TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_brands_workspace ON brands(workspace, created_at DESC);
`)

interface PromptRow {
  id: string
  workspace: string
  title: string
  task: string
  tool: string
  style: string
  brief: string
  favorite: number
  input_json: string
  result_json: string
  created_at: string
  updated_at: string
}

interface BrandRow {
  id: string
  workspace: string
  name: string
  industry: string
  audience: string
  tone: string
  palette_json: string
  keywords: string
  avoid: string
  created_at: string
}

function mapPrompt(row: PromptRow): SavedPrompt {
  return {
    id: row.id,
    workspace: row.workspace,
    title: row.title,
    task: row.task as SavedPrompt['task'],
    tool: row.tool as SavedPrompt['tool'],
    style: row.style,
    brief: row.brief,
    favorite: Boolean(row.favorite),
    input: JSON.parse(row.input_json) as PromptInput,
    result: JSON.parse(row.result_json) as GenerateResult,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapBrand(row: BrandRow): BrandKit {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    audience: row.audience,
    tone: row.tone,
    palette: JSON.parse(row.palette_json) as string[],
    keywords: row.keywords,
    avoid: row.avoid,
    createdAt: row.created_at,
  }
}

export function insertPrompt(
  workspace: string,
  input: PromptInput,
  result: GenerateResult,
  options: { id?: string; createdAt?: string; favorite?: boolean } = {},
): SavedPrompt {
  const id = options.id ?? randomUUID()
  const now = options.createdAt ?? new Date().toISOString()
  db.prepare(
    `INSERT INTO prompts (id, workspace, title, task, tool, style, brief, favorite, input_json, result_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    workspace,
    result.title,
    result.task,
    result.tool,
    result.style,
    input.brief,
    options.favorite ? 1 : 0,
    JSON.stringify(input),
    JSON.stringify(result),
    now,
    now,
  )
  return {
    id,
    workspace,
    title: result.title,
    task: result.task,
    tool: result.tool,
    style: result.style,
    brief: input.brief,
    favorite: Boolean(options.favorite),
    input,
    result,
    createdAt: now,
    updatedAt: now,
  }
}

export function listPrompts(
  workspace: string,
  filters: { q?: string; task?: string; tool?: string; favorite?: boolean; limit?: number } = {},
): PromptListItem[] {
  const clauses = ['workspace = ?']
  const params: Array<string | number> = [workspace]
  if (filters.q) {
    clauses.push('(title LIKE ? OR brief LIKE ? OR style LIKE ?)')
    const like = `%${filters.q}%`
    params.push(like, like, like)
  }
  if (filters.task) {
    clauses.push('task = ?')
    params.push(filters.task)
  }
  if (filters.tool) {
    clauses.push('tool = ?')
    params.push(filters.tool)
  }
  if (filters.favorite) clauses.push('favorite = 1')
  const limit = Math.min(Math.max(filters.limit ?? 60, 1), 200)
  params.push(limit)
  const rows = db
    .prepare(
      `SELECT id, workspace, title, task, tool, style, brief, favorite, input_json, result_json, created_at, updated_at
       FROM prompts WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...params) as unknown as PromptRow[]

  return rows.map((row) => {
    const result = JSON.parse(row.result_json) as GenerateResult
    return {
      id: row.id,
      title: row.title,
      task: row.task as SavedPrompt['task'],
      tool: row.tool as SavedPrompt['tool'],
      toolName: result.toolName,
      style: row.style,
      styleName: result.style,
      brief: row.brief,
      favorite: Boolean(row.favorite),
      createdAt: row.created_at,
    }
  })
}

export function getPrompt(workspace: string, id: string): SavedPrompt | null {
  const row = db.prepare('SELECT * FROM prompts WHERE id = ? AND workspace = ?').get(id, workspace) as
    | PromptRow
    | undefined
  return row ? mapPrompt(row) : null
}

export function updatePrompt(
  workspace: string,
  id: string,
  patch: { favorite?: boolean; title?: string },
): SavedPrompt | null {
  const existing = getPrompt(workspace, id)
  if (!existing) return null
  const title = typeof patch.title === 'string' && patch.title.trim() ? patch.title.trim().slice(0, 200) : existing.title
  const favorite = typeof patch.favorite === 'boolean' ? patch.favorite : existing.favorite
  db.prepare('UPDATE prompts SET title = ?, favorite = ?, updated_at = ? WHERE id = ? AND workspace = ?').run(
    title,
    favorite ? 1 : 0,
    new Date().toISOString(),
    id,
    workspace,
  )
  return getPrompt(workspace, id)
}

export function deletePrompt(workspace: string, id: string): boolean {
  const result = db.prepare('DELETE FROM prompts WHERE id = ? AND workspace = ?').run(id, workspace)
  return result.changes > 0
}

export function duplicatePrompt(workspace: string, id: string): SavedPrompt | null {
  const original = getPrompt(workspace, id)
  if (!original) return null
  const copy: GenerateResult = {
    ...original.result,
    title: `${original.result.title} (สำเนา)`,
    createdAt: new Date().toISOString(),
  }
  return insertPrompt(workspace, original.input, copy)
}

export function getStats(workspace: string, aiEnabled: boolean): Stats {
  const base = db.prepare('SELECT COUNT(*) as c FROM prompts WHERE workspace = ?').get(workspace) as { c: number }
  const fav = db
    .prepare('SELECT COUNT(*) as c FROM prompts WHERE workspace = ? AND favorite = 1')
    .get(workspace) as { c: number }
  const brandCount = db.prepare('SELECT COUNT(*) as c FROM brands WHERE workspace = ?').get(workspace) as { c: number }
  const toolRows = db
    .prepare('SELECT tool, COUNT(*) as c FROM prompts WHERE workspace = ? GROUP BY tool')
    .all(workspace) as Array<{ tool: string; c: number }>
  const taskRows = db
    .prepare('SELECT task, COUNT(*) as c FROM prompts WHERE workspace = ? GROUP BY task')
    .all(workspace) as Array<{ task: string; c: number }>

  return {
    saved: base.c,
    favorites: fav.c,
    brands: brandCount.c,
    tools: toolRows.length,
    byTask: taskRows.map((row) => ({ task: row.task as SavedPrompt['task'], count: row.c })),
    recent: listPrompts(workspace, { limit: 4 }),
    aiEnabled,
  }
}

export function listBrands(workspace: string): BrandKit[] {
  const rows = db
    .prepare('SELECT * FROM brands WHERE workspace = ? ORDER BY created_at DESC')
    .all(workspace) as unknown as BrandRow[]
  return rows.map(mapBrand)
}

export function createBrand(
  workspace: string,
  data: Omit<BrandKit, 'id' | 'createdAt'>,
): BrandKit {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO brands (id, workspace, name, industry, audience, tone, palette_json, keywords, avoid, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    workspace,
    data.name,
    data.industry,
    data.audience,
    data.tone,
    JSON.stringify(data.palette),
    data.keywords,
    data.avoid,
    createdAt,
  )
  return { id, ...data, createdAt }
}

export function updateBrand(
  workspace: string,
  id: string,
  data: Partial<Omit<BrandKit, 'id' | 'createdAt'>>,
): BrandKit | null {
  const existing = listBrands(workspace).find((brand) => brand.id === id)
  if (!existing) return null
  const next = { ...existing, ...data }
  db.prepare(
    'UPDATE brands SET name = ?, industry = ?, audience = ?, tone = ?, palette_json = ?, keywords = ?, avoid = ? WHERE id = ? AND workspace = ?',
  ).run(
    next.name,
    next.industry,
    next.audience,
    next.tone,
    JSON.stringify(next.palette),
    next.keywords,
    next.avoid,
    id,
    workspace,
  )
  return next
}

export function deleteBrand(workspace: string, id: string): boolean {
  const result = db.prepare('DELETE FROM brands WHERE id = ? AND workspace = ?').run(id, workspace)
  return result.changes > 0
}

function seed() {
  const existing = db.prepare("SELECT COUNT(*) as c FROM prompts WHERE workspace = 'demo'").get() as { c: number }
  if (existing.c > 0) return

  const now = Date.now()
  const picks = ['botanica-serum', 'coffee-series', 'festival-poster', 'restaurant-film']
  picks.forEach((templateId, index) => {
    const template = TEMPLATES.find((item) => item.id === templateId)
    if (!template) return
    const input = { ...DEFAULT_INPUT, ...template.input } as PromptInput
    const result = generatePrompt(input)
    const createdAt = new Date(now - index * 86400000 - 3600000).toISOString()
    insertPrompt('demo', input, result, {
      id: `seed-${templateId}`,
      createdAt,
      favorite: index === 0 || index === 2,
    })
  })

  const brands: Array<Omit<BrandKit, 'id' | 'createdAt'>> = [
    {
      name: 'Siam Botanica',
      industry: 'สกินแคร์จากพืชพรรณไทย',
      audience: 'ผู้หญิง 28–45 ปี ที่สนใจสกินแคร์ธรรมชาติ',
      tone: 'สงบ จริงใจ พรีเมียมแบบเข้าถึงได้',
      palette: ['#3f4a35', '#c8a96a', '#e5e0d0', '#2b2621'],
      keywords: 'พฤกษา, หัตถกรรม, ความงามที่จริงใจ',
      avoid: 'ภาพผิวพลาสติก, คำว่า miracle, การเปรียบเทียบกับแบรนด์อื่น',
    },
    {
      name: 'Brew & Bloom',
      industry: 'คาเฟ่ specialty coffee',
      audience: 'คนทำงานวัย 22–35 ปี ในย่านใจกลางเมือง',
      tone: 'อบอุ่น เป็นกันเอง มีความตั้งใจในรายละเอียด',
      palette: ['#8c3b2e', '#e5d5bd', '#3b2f2a', '#6b7a54'],
      keywords: 'วันที่ฝนตก, บาริสต้า, งานฝีมือ',
      avoid: 'ภาพสต็อกคนยิ้มกว้าง, โทนฟ้าเย็น, ข้อความขายตรง',
    },
    {
      name: 'NORTH Bangkok',
      industry: 'แฟชั่นไทยร่วมสมัย',
      audience: 'ลูกค้าพรีเมียมและนักออกแบบ',
      tone: 'นิ่ง มั่นใจ ไม่ต้องอธิบายมาก',
      palette: ['#e8ded2', '#8c3b2e', '#2f2a26', '#111111'],
      keywords: 'ผ้าไทย, โครงสร้าง, ความเงียบ',
      avoid: 'ภาพวัฒนธรรมแบบเดิม ๆ, การตกแต่งเกิน, โลโก้ใหญ่',
    },
  ]

  brands.forEach((brand, index) => {
    db.prepare(
      `INSERT INTO brands (id, workspace, name, industry, audience, tone, palette_json, keywords, avoid, created_at)
       VALUES (?, 'demo', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `seed-brand-${index + 1}`,
      brand.name,
      brand.industry,
      brand.audience,
      brand.tone,
      JSON.stringify(brand.palette),
      brand.keywords,
      brand.avoid,
      new Date(now - index * 86400000).toISOString(),
    )
  })
}

seed()
