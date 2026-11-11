import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promptroom-test-'))
process.env.DATA_DIR = tempDir
process.env.DB_PATH = path.join(tempDir, 'test.db')
process.env.RATE_LIMIT_DISABLED = '1'
delete process.env.OPENAI_API_KEY

const { createApp } = await import('../server/app')
const { resetRateLimits } = await import('../server/rate-limit')
const { closeDatabase } = await import('../server/db')

const app = createApp({ dist: path.join(tempDir, 'no-dist') })
let server: Server
let base = ''

function url(pathname: string) {
  return `${base}${pathname}`
}

async function api(
  pathname: string,
  options: RequestInit & { workspace?: string } = {},
): Promise<{ status: number; body: any; headers: Headers }> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (options.workspace) headers.set('x-workspace', options.workspace)
  const response = await fetch(url(pathname), { ...options, headers })
  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: response.status, body, headers: response.headers }
}

const validInput = {
  brief: 'ภาพสินค้าเซรั่มจากพืชพรรณไทยในขวดแก้วอำพัน วางบนหินทรายธรรมชาติ มีใบเตยและหยดน้ำ',
  brand: 'Test Brand',
  audience: 'ทีมทดสอบ',
  task: 'image',
  tool: 'midjourney',
  style: 'editorial',
  variations: 3,
}

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      base = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  closeDatabase()
  try {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 })
  } catch {
    /* Windows may briefly lock the WAL file — temp dir is disposable */
  }
})

test('GET /api/health returns ok', async () => {
  const { status, body } = await api('/api/health')
  assert.equal(status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.service, 'promptroom')
  assert.equal(body.aiEnabled, false)
})

test('GET /api/templates returns the full template set', async () => {
  const { status, body } = await api('/api/templates')
  assert.equal(status, 200)
  assert.ok(Array.isArray(body.templates))
  assert.ok(body.templates.length >= 6)
})

test('POST /api/generate validates the brief with a Thai message', async () => {
  const { status, body } = await api('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ input: { ...validInput, brief: 'สั้น' } }),
  })
  assert.equal(status, 400)
  assert.match(body.error, /8 ตัวอักษร/)
})

test('POST /api/generate rejects malformed JSON with 400', async () => {
  const response = await fetch(url('/api/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"input": ',
  })
  assert.equal(response.status, 400)
  const body = (await response.json()) as { error: string }
  assert.match(body.error, /JSON/)
})

test('POST /api/generate rejects a non-object input', async () => {
  const { status, body } = await api('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ input: 'not-an-object' }),
  })
  assert.equal(status, 400)
  assert.match(body.error, /object/)
})

test('prompt lifecycle: create, list, read, patch, duplicate, delete', async () => {
  const created = await api('/api/generate', {
    method: 'POST',
    workspace: 'test-lifecycle',
    body: JSON.stringify({ input: validInput }),
  })
  assert.equal(created.status, 201)
  const id = created.body.id as string
  assert.ok(id)
  assert.ok(created.body.result.masterPrompt.length > 100)
  assert.ok(created.body.result.variations.length >= 2)

  const list = await api('/api/prompts', { workspace: 'test-lifecycle' })
  assert.equal(list.status, 200)
  assert.equal(list.body.prompts.length, 1)
  assert.equal(list.body.prompts[0].id, id)

  const detail = await api(`/api/prompts/${id}`, { workspace: 'test-lifecycle' })
  assert.equal(detail.status, 200)
  assert.equal(detail.body.prompt.id, id)
  assert.equal(detail.body.prompt.input.brief, validInput.brief)

  const renamed = await api(`/api/prompts/${id}`, {
    method: 'PATCH',
    workspace: 'test-lifecycle',
    body: JSON.stringify({ title: 'ชื่อใหม่', favorite: true }),
  })
  assert.equal(renamed.status, 200)
  assert.equal(renamed.body.prompt.title, 'ชื่อใหม่')
  assert.equal(renamed.body.prompt.favorite, true)

  const emptyPatch = await api(`/api/prompts/${id}`, {
    method: 'PATCH',
    workspace: 'test-lifecycle',
    body: JSON.stringify({}),
  })
  assert.equal(emptyPatch.status, 400)

  const emptyTitle = await api(`/api/prompts/${id}`, {
    method: 'PATCH',
    workspace: 'test-lifecycle',
    body: JSON.stringify({ title: '   ' }),
  })
  assert.equal(emptyTitle.status, 400)

  const favoriteOnly = await api('/api/prompts?favorite=1', { workspace: 'test-lifecycle' })
  assert.equal(favoriteOnly.body.prompts.length, 1)

  const duplicate = await api(`/api/prompts/${id}/duplicate`, {
    method: 'POST',
    workspace: 'test-lifecycle',
  })
  assert.equal(duplicate.status, 201)
  assert.notEqual(duplicate.body.prompt.id, id)
  assert.match(duplicate.body.prompt.title, /สำเนา/)

  const afterDuplicate = await api('/api/prompts', { workspace: 'test-lifecycle' })
  assert.equal(afterDuplicate.body.prompts.length, 2)

  const removed = await api(`/api/prompts/${id}`, { method: 'DELETE', workspace: 'test-lifecycle' })
  assert.equal(removed.status, 200)

  const missing = await api(`/api/prompts/${id}`, { workspace: 'test-lifecycle' })
  assert.equal(missing.status, 404)
})

test('workspace header isolates prompts between teams', async () => {
  const created = await api('/api/generate', {
    method: 'POST',
    workspace: 'team-a',
    body: JSON.stringify({ input: validInput }),
  })
  assert.equal(created.status, 201)

  const teamA = await api('/api/prompts', { workspace: 'team-a' })
  const teamB = await api('/api/prompts', { workspace: 'team-b' })
  assert.ok(teamA.body.prompts.length >= 1)
  assert.ok(teamB.body.prompts.every((item: { id: string }) => item.id !== created.body.id))

  const crossRead = await api(`/api/prompts/${created.body.id}`, { workspace: 'team-b' })
  assert.equal(crossRead.status, 404)
})

test('brand lifecycle validates names and normalises palettes', async () => {
  const missingName = await api('/api/brands', {
    method: 'POST',
    workspace: 'test-brand',
    body: JSON.stringify({ industry: 'คาเฟ่' }),
  })
  assert.equal(missingName.status, 400)
  assert.match(missingName.body.error, /ชื่อแบรนด์/)

  const created = await api('/api/brands', {
    method: 'POST',
    workspace: 'test-brand',
    body: JSON.stringify({
      name: 'Test Cafe',
      industry: 'คาเฟ่',
      palette: ['#3f4a35', 'c8a96a', '#3f4a35', 'not-a-color', '#e5e0d0'],
    }),
  })
  assert.equal(created.status, 201)
  assert.deepEqual(created.body.brand.palette, ['#3f4a35', '#c8a96a', '#e5e0d0'])

  const patched = await api(`/api/brands/${created.body.brand.id}`, {
    method: 'PATCH',
    workspace: 'test-brand',
    body: JSON.stringify({ name: 'Test Cafe Renamed', tone: 'อบอุ่น' }),
  })
  assert.equal(patched.status, 200)
  assert.equal(patched.body.brand.tone, 'อบอุ่น')

  const emptyName = await api(`/api/brands/${created.body.brand.id}`, {
    method: 'PATCH',
    workspace: 'test-brand',
    body: JSON.stringify({ name: '' }),
  })
  assert.equal(emptyName.status, 400)

  const list = await api('/api/brands', { workspace: 'test-brand' })
  assert.equal(list.body.brands.length, 1)

  const removed = await api(`/api/brands/${created.body.brand.id}`, {
    method: 'DELETE',
    workspace: 'test-brand',
  })
  assert.equal(removed.status, 200)

  const missing = await api(`/api/brands/${created.body.brand.id}`, {
    method: 'DELETE',
    workspace: 'test-brand',
  })
  assert.equal(missing.status, 404)
})

test('stats reflect saved prompts and brands', async () => {
  const stats = await api('/api/stats', { workspace: 'test-lifecycle' })
  assert.equal(stats.status, 200)
  assert.ok(stats.body.saved >= 1)
  assert.equal(typeof stats.body.aiEnabled, 'boolean')
})

test('unknown API routes return a Thai 404 payload', async () => {
  const { status, body } = await api('/api/does-not-exist')
  assert.equal(status, 404)
  assert.match(body.error, /ไม่พบ API/)
})

test('AI Boost without a key responds 503', async () => {
  const { status, body } = await api('/api/boost', {
    method: 'POST',
    body: JSON.stringify({ masterPrompt: 'master', toolPrompt: 'a reasonably long draft prompt' }),
  })
  assert.equal(status, 503)
  assert.match(body.error, /OPENAI_API_KEY/)
})

test('AI Boost validates an empty draft before contacting a provider', async () => {
  const { status, body } = await api('/api/boost', {
    method: 'POST',
    body: JSON.stringify({ masterPrompt: 'master', toolPrompt: '' }),
  })
  assert.equal(status, 503)
  assert.ok(body.error)
})

test('rate limiter eventually returns 429 with Retry-After', async () => {
  resetRateLimits()
  process.env.RATE_LIMIT_DISABLED = '0'
  try {
    let limited = false
    let retryAfter = ''
    for (let index = 0; index < 14; index += 1) {
      const response = await api('/api/boost', {
        method: 'POST',
        workspace: 'rate-test',
        body: JSON.stringify({ masterPrompt: 'm', toolPrompt: 'a reasonably long draft prompt' }),
      })
      if (response.status === 429) {
        limited = true
        retryAfter = response.headers.get('retry-after') ?? ''
        assert.match(response.body.error, /ถี่เกินไป/)
        break
      }
    }
    assert.equal(limited, true)
    assert.ok(retryAfter)
  } finally {
    process.env.RATE_LIMIT_DISABLED = '1'
    resetRateLimits()
  }
})
