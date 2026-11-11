import './env'
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import type { PromptInput } from '../shared/types'
import { findTool } from '../shared/options'
import { TEMPLATES } from '../shared/templates'
import { generatePrompt } from '../shared/engine'
import {
  createBrand,
  deleteBrand,
  deletePrompt,
  duplicatePrompt,
  getPrompt,
  getStats,
  insertPrompt,
  listBrands,
  listPrompts,
  updateBrand,
  updatePrompt,
} from './db'
import { normalizeWorkspace } from './normalize'
import { rateLimit } from './rate-limit'
import {
  ApiError,
  readBoost,
  readBrand,
  readGenerate,
  readLimit,
  readPromptPatch,
} from './validate'

export interface CreateAppOptions {
  /** โฟลเดอร์ build ของ frontend (ค่าเริ่มต้น: ./dist) */
  dist?: string
}

const AI_BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const startedAt = new Date()

function aiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

/** ครอบ handler ให้ error ถูกส่งเข้า error middleware เสมอ (Express 4) */
function handle(fn: (req: Request, res: Response) => unknown): RequestHandler {
  return (req, res, next) => {
    try {
      const result = fn(req, res)
      if (result instanceof Promise) result.catch(next)
    } catch (error) {
      next(error)
    }
  }
}

function workspaceOf(req: Request): string {
  return normalizeWorkspace(req.get('x-workspace'))
}

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message })
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express()
  const dist = path.resolve(options.dist ?? 'dist')

  app.disable('x-powered-by')
  app.set('trust proxy', true)
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store')
    next()
  })

  const generateLimiter = rateLimit({
    name: 'generate',
    windowMs: 60_000,
    max: 30,
    message: 'สร้างพรอมป์ถี่เกินไป — รอสักครู่แล้วลองอีกครั้ง',
  })
  const previewLimiter = rateLimit({
    name: 'preview',
    windowMs: 60_000,
    max: 60,
    message: 'พรีวิวถี่เกินไป — รอสักครู่แล้วลองอีกครั้ง',
  })
  const boostLimiter = rateLimit({
    name: 'boost',
    windowMs: 60_000,
    max: 12,
    message: 'เรียก AI Boost ถี่เกินไป — รอสักครู่แล้วลองอีกครั้ง',
  })

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'promptroom',
      version: '1.0.0',
      aiEnabled: aiEnabled(),
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: startedAt.toISOString(),
      time: new Date().toISOString(),
    })
  })

  app.get('/api/templates', (_req, res) => {
    res.json({ templates: TEMPLATES })
  })

  app.get('/api/stats', (_req, res) => {
    res.json(getStats(workspaceOf(_req), aiEnabled()))
  })

  app.post(
    '/api/generate',
    generateLimiter,
    handle((req, res) => {
      const input = readGenerate(req.body)
      const result = generatePrompt(input)
      const saved = insertPrompt(workspaceOf(req), input, result)
      res.status(201).json({ id: saved.id, result, savedAt: saved.createdAt })
    }),
  )

  app.post(
    '/api/generate/preview',
    previewLimiter,
    handle((req, res) => {
      const input = readGenerate(req.body)
      res.json({ result: generatePrompt(input) })
    }),
  )

  app.get(
    '/api/prompts',
    handle((req, res) => {
      const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : undefined
      const task = typeof req.query.task === 'string' ? req.query.task.slice(0, 40) : undefined
      const tool = typeof req.query.tool === 'string' ? req.query.tool.slice(0, 40) : undefined
      const favorite = req.query.favorite === '1'
      const limit = readLimit(req.query.limit)
      res.json({ prompts: listPrompts(workspaceOf(req), { q, task, tool, favorite, limit }) })
    }),
  )

  app.get(
    '/api/prompts/:id',
    handle((req, res) => {
      const prompt = getPrompt(workspaceOf(req), req.params.id)
      if (!prompt) throw new ApiError(404, 'ไม่พบพรอมป์นี้ในคลัง')
      res.json({ prompt })
    }),
  )

  app.patch(
    '/api/prompts/:id',
    handle((req, res) => {
      const prompt = updatePrompt(workspaceOf(req), req.params.id, readPromptPatch(req.body))
      if (!prompt) throw new ApiError(404, 'ไม่พบพรอมป์นี้ในคลัง')
      res.json({ prompt })
    }),
  )

  app.delete(
    '/api/prompts/:id',
    handle((req, res) => {
      const ok = deletePrompt(workspaceOf(req), req.params.id)
      if (!ok) throw new ApiError(404, 'ไม่พบพรอมป์นี้ในคลัง')
      res.json({ ok: true })
    }),
  )

  app.post(
    '/api/prompts/:id/duplicate',
    handle((req, res) => {
      const prompt = duplicatePrompt(workspaceOf(req), req.params.id)
      if (!prompt) throw new ApiError(404, 'ไม่พบพรอมป์นี้ในคลัง')
      res.status(201).json({ prompt })
    }),
  )

  app.get(
    '/api/brands',
    handle((req, res) => {
      res.json({ brands: listBrands(workspaceOf(req)) })
    }),
  )

  app.post(
    '/api/brands',
    handle((req, res) => {
      const payload = readBrand(req.body) as Required<ReturnType<typeof readBrand>>
      const brand = createBrand(workspaceOf(req), {
        name: payload.name,
        industry: payload.industry,
        audience: payload.audience,
        tone: payload.tone,
        palette: payload.palette,
        keywords: payload.keywords,
        avoid: payload.avoid,
      })
      res.status(201).json({ brand })
    }),
  )

  app.patch(
    '/api/brands/:id',
    handle((req, res) => {
      const brand = updateBrand(workspaceOf(req), req.params.id, readBrand(req.body, { partial: true }))
      if (!brand) throw new ApiError(404, 'ไม่พบแบรนด์นี้')
      res.json({ brand })
    }),
  )

  app.delete(
    '/api/brands/:id',
    handle((req, res) => {
      const ok = deleteBrand(workspaceOf(req), req.params.id)
      if (!ok) throw new ApiError(404, 'ไม่พบแบรนด์นี้')
      res.json({ ok: true })
    }),
  )

  app.post(
    '/api/boost',
    boostLimiter,
    handle(async (req, res) => {
      if (!aiEnabled()) {
        throw new ApiError(503, 'ยังไม่ได้ตั้งค่า OPENAI_API_KEY สำหรับฟีเจอร์ AI Boost')
      }

      const { masterPrompt, toolPrompt, tool: toolId, mode } = readBoost(req.body)
      const tool = findTool(toolId as PromptInput['tool'])

      const instruction =
        mode === 'enhance'
          ? 'Critique the draft internally. Rewrite it to be more specific, more repeatable and less reliant on unmeasurable adjectives. Keep the art direction, palette, lighting and aspect ratio. Preserve any real tool parameters that are correct and remove invented ones.'
          : 'Rewrite the draft as a final, natural English tool prompt. Translate every Thai phrase into natural English without changing the intent. Keep the visual direction, subject, styling, lighting, palette, lens and aspect ratio. Preserve valid parameters for the target tool and remove invented ones.'

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45000)
      try {
        const response = await fetch(`${AI_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: AI_MODEL,
            temperature: 0.4,
            max_tokens: 1400,
            messages: [
              {
                role: 'system',
                content:
                  'You are a senior art director and prompt engineer. You return only the final prompt text, with no headings, commentary or quotation marks.',
              },
              {
                role: 'user',
                content: `Target tool: ${tool.name}\nTask: ${instruction}\n\nMASTER PROMPT (context, do not repeat):\n${masterPrompt}\n\nDRAFT PROMPT TO REWRITE:\n${toolPrompt}`,
              },
            ],
          }),
          signal: controller.signal,
        })
        if (!response.ok) {
          const detail = await response.text()
          console.error('[boost] provider error', response.status, detail.slice(0, 300))
          throw new ApiError(502, 'ผู้ให้บริการ AI ตอบกลับผิดพลาด กรุณาตรวจสอบ API key และโมเดล')
        }
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const text = data.choices?.[0]?.message?.content?.trim()
        if (!text) throw new ApiError(502, 'AI ไม่ได้ส่งพรอมป์กลับมา')
        res.json({ text, model: AI_MODEL })
      } catch (error) {
        if (error instanceof ApiError) throw error
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError(504, 'AI ใช้เวลานานเกินไป — ลองอีกครั้งหรือใช้พรอมป์ต้นฉบับ')
        }
        throw new ApiError(502, 'เชื่อมต่อ AI ไม่สำเร็จ กรุณาลองอีกครั้ง')
      } finally {
        clearTimeout(timer)
      }
    }),
  )

  app.use('/api', (_req, res) => {
    fail(res, 404, 'ไม่พบ API นี้')
  })

  const hasDist = fs.existsSync(path.join(dist, 'index.html'))
  if (hasDist) {
    app.use(
      express.static(dist, {
        index: false,
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
        },
      }),
    )
    app.get('*', (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'))
    })
  } else {
    app.get('/', (_req, res) => {
      res.type('text/plain').send(
        'PROMPTROOM API is running.\n\nFrontend ยังไม่ถูก build — รัน `npm run dev` สำหรับโหมดพัฒนา หรือ `npm run build` แล้วรัน `npm start`\nHealth: /api/health',
      )
    })
  }

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return

    if (error instanceof ApiError) {
      return fail(res, error.status, error.message)
    }

    // express.json() โยน SyntaxError พร้อม type entity.parse.failed
    const parseError = error as Error & { type?: string; status?: number }
    if (parseError.type === 'entity.parse.failed' || (error instanceof SyntaxError && parseError.status === 400)) {
      return fail(res, 400, 'ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง')
    }
    if (parseError.type === 'entity.too.large') {
      return fail(res, 413, 'ข้อมูลที่ส่งมามีขนาดใหญ่เกินกำหนด (1MB)')
    }

    console.error('[server]', error)
    fail(res, 500, 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์')
  })

  return app
}
