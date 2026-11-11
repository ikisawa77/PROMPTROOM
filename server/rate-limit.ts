import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { normalizeWorkspace } from './normalize'

interface Bucket {
  count: number
  resetAt: number
}

export interface RateLimitOptions {
  /** ชื่อกลุ่มสำหรับแยก bucket ระหว่าง endpoint */
  name: string
  windowMs: number
  max: number
  message: string
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 5000

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/**
 * Rate limiter แบบ in-memory แยกตาม IP + workspace
 * ปิดได้ด้วย RATE_LIMIT_DISABLED=1 สำหรับการทดสอบ
 */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.RATE_LIMIT_DISABLED === '1') return next()

    const now = Date.now()
    sweep(now)
    const workspace = normalizeWorkspace(req.get('x-workspace'))
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const key = `${options.name}:${ip}:${workspace}`

    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs }
      buckets.set(key, bucket)
    }

    bucket.count += 1
    const remaining = Math.max(0, options.max - bucket.count)
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))

    res.setHeader('X-RateLimit-Limit', String(options.max))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(retryAfter))
      res.status(429).json({
        error: options.message,
        retryAfterSeconds: retryAfter,
      })
      return
    }

    next()
  }
}

/** ใช้ในเทสต์เท่านั้น */
export function resetRateLimits() {
  buckets.clear()
}
