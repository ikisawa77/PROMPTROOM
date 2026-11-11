import './env'
import { createApp } from './app'

const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '0.0.0.0'
const app = createApp()
const aiEnabled = Boolean(process.env.OPENAI_API_KEY)

const server = app.listen(PORT, HOST, () => {
  console.log(`[promptroom] API ready on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
  console.log(
    `[promptroom] frontend: ${process.env.NODE_ENV === 'production' ? 'serving ./dist' : 'dist ถ้ามี / dev mode ใช้ vite'}`,
  )
  console.log(`[promptroom] ai boost: ${aiEnabled ? `enabled (${process.env.OPENAI_MODEL || 'gpt-4o-mini'})` : 'disabled'}`)
})

function shutdown(signal: string) {
  console.log(`[promptroom] ${signal} received — closing server`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
