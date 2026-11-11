#!/usr/bin/env node
/**
 * PROMPTROOM — Local Control Center
 * Start / stop / restart / force-stop the app server, stream logs,
 * run production builds and check localhost readiness.
 *
 * Binds to 127.0.0.1 only. Control port: 9090 (override with CONTROL_PORT).
 * App port: 8787 (override with APP_PORT).
 */

import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawn, execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(__dirname, 'public')
const DATA_DIR = path.join(ROOT, 'data')
const CONFIG_PATH = path.join(DATA_DIR, 'control-center.json')
fs.mkdirSync(DATA_DIR, { recursive: true })

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {
  /* no .env file */
}

const CONTROL_PORT = Number(process.env.CONTROL_PORT || 9090)
const APP_PORT = Number(process.env.APP_PORT || process.env.PORT || 8787)
const IS_WIN = process.platform === 'win32'
const MAX_LOGS = 900

function loadConfig() {
  const defaults = { mode: 'prod', autoRestart: false }
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }
  } catch {
    return defaults
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ mode: config.mode, autoRestart: config.autoRestart }, null, 2))
  } catch {
    /* ignore */
  }
}

const config = loadConfig()

const state = {
  status: 'stopped',
  mode: config.mode === 'dev' ? 'dev' : 'prod',
  pid: null,
  portPid: null,
  startedAt: null,
  stoppingAt: null,
  lastExit: null,
  lastAction: null,
  intentionalStop: false,
  restarts: 0,
  memoryMB: null,
  health: null,
  healthCheckedAt: null,
  logs: [],
  logSeq: 0,
  history: [],
  sseClients: new Set(),
  child: null,
  buildProcess: null,
}

const now = () => new Date().toISOString()

function appUrl() {
  return state.mode === 'dev' ? 'http://localhost:5173' : `http://localhost:${APP_PORT}`
}

function healthUrl() {
  return `http://127.0.0.1:${APP_PORT}/api/health`
}

function uptimeSeconds() {
  if (state.health?.uptimeSeconds) return state.health.uptimeSeconds
  if (!state.startedAt) return 0
  return Math.max(0, Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000))
}

function addHistory(action, ok, message) {
  state.history.unshift({ time: now(), action, ok, message })
  state.history = state.history.slice(0, 40)
}

function addLog(stream, text) {
  const clean = String(text).replace(/\r/g, '').replace(/\x1b\[[0-9;]*m/g, '')
  const lines = clean.split('\n').filter((line) => line.trim().length > 0)
  for (const line of lines) {
    const entry = { id: ++state.logSeq, time: now(), stream, text: line.slice(0, 2000) }
    state.logs.push(entry)
    if (state.logs.length > MAX_LOGS) state.logs.splice(0, state.logs.length - MAX_LOGS)
    for (const client of state.sseClients) {
      client.write(`data: ${JSON.stringify(entry)}\n\n`)
    }
  }
}

function addSystem(text) {
  addLog('system', `[control] ${text}`)
}

async function findPortPid(port) {
  try {
    if (IS_WIN) {
      const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp'], { timeout: 4000 })
      for (const line of stdout.split('\n')) {
        const match = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i)
        if (match && Number(match[1]) === port) return Number(match[2])
      }
      return null
    }
    const { stdout } = await execFileAsync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      timeout: 4000,
    })
    const pid = Number(stdout.trim().split('\n')[0])
    return Number.isFinite(pid) && pid > 0 ? pid : null
  } catch {
    return null
  }
}

async function findMemoryMB(pid) {
  if (!pid) return null
  try {
    if (IS_WIN) {
      const { stdout } = await execFileAsync(
        'tasklist',
        ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'],
        { timeout: 4000 },
      )
      const match = stdout.match(/"([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)"/)
      if (!match) return null
      const mem = Number(match[5].replace(/[^\d]/g, ''))
      return Number.isFinite(mem) && mem > 0 ? Math.round(mem / 1024) : null
    }
    const { stdout } = await execFileAsync('ps', ['-o', 'rss=', '-p', String(pid)], { timeout: 4000 })
    const kb = Number(stdout.trim())
    return Number.isFinite(kb) ? Math.round(kb / 1024) : null
  } catch {
    return null
  }
}

async function checkHealth() {
  try {
    const response = await fetch(healthUrl(), { signal: AbortSignal.timeout(1800) })
    if (!response.ok) throw new Error('not ok')
    const data = await response.json()
    state.health = data
    state.healthCheckedAt = now()
    return data
  } catch {
    state.health = null
    state.healthCheckedAt = now()
    return null
  }
}

let pollCounter = 0
async function poll() {
  let shouldBroadcast = false
  const wasHealth = Boolean(state.health)
  await checkHealth()
  pollCounter += 1
  if (pollCounter % 2 === 0) {
    const pid = await findPortPid(APP_PORT)
    state.portPid = pid
    state.memoryMB = pid ? await findMemoryMB(pid) : null
  }

  if (state.child) {
    state.pid = state.child.pid ?? state.pid
    if (state.status === 'starting' && state.health) {
      state.status = 'running'
      state.startedAt = state.startedAt ?? now()
      addSystem(`เซิร์ฟเวอร์ตอบสนองแล้วที่ ${appUrl()}`)
      shouldBroadcast = true
    }
    if (state.status === 'stopping') {
      // wait handled by stop()
    }
  } else if (!state.buildProcess) {
    if (state.health && state.status !== 'external') {
      if (state.status !== 'stopping') {
        state.status = 'external'
        state.portPid = state.portPid ?? null
        shouldBroadcast = true
      }
    } else if (!state.health && state.status === 'external') {
      state.status = 'stopped'
      shouldBroadcast = true
    } else if (!state.health && state.status === 'running') {
      state.status = 'error'
      addSystem('ขาดการติดต่อกับ API — ตรวจสอบ log ด้านล่าง')
      shouldBroadcast = true
    }
  }

  if (wasHealth !== Boolean(state.health)) shouldBroadcast = true
  if (shouldBroadcast) broadcastState()
}

function broadcastState() {
  const payload = stateSnapshot()
  for (const client of state.sseClients) {
    client.write(`event: state\ndata: ${JSON.stringify(payload)}\n\n`)
  }
}

function stateSnapshot() {
  return {
    status: state.status,
    mode: state.mode,
    pid: state.pid,
    portPid: state.portPid,
    appPort: APP_PORT,
    controlPort: CONTROL_PORT,
    appUrl: appUrl(),
    healthUrl: healthUrl(),
    startedAt: state.startedAt,
    uptimeSeconds: uptimeSeconds(),
    memoryMB: state.memoryMB,
    health: state.health,
    healthCheckedAt: state.healthCheckedAt,
    lastExit: state.lastExit,
    lastAction: state.lastAction,
    autoRestart: config.autoRestart,
    building: Boolean(state.buildProcess),
    distExists: fs.existsSync(path.join(ROOT, 'dist', 'index.html')),
    nodeVersion: process.version,
    platform: process.platform,
    logsCount: state.logs.length,
    history: state.history,
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
    appExists: fs.existsSync(path.join(ROOT, 'server', 'index.ts')),
    time: now(),
  }
}

function windowsCommand(script) {
  return { command: 'cmd.exe', args: ['/d', '/s', '/c', `npm run ${script}`] }
}

function spawnApp() {
  if (state.child) throw new Error('เซิร์ฟเวอร์กำลังทำงานอยู่แล้ว')
  if (state.buildProcess) throw new Error('กำลัง build อยู่ กรุณารอให้เสร็จก่อน')
  if (state.mode === 'prod' && !fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('ยังไม่มี production build — กด "Build" ก่อนสตาร์ทโหมด Production')
  }

  const script = state.mode === 'dev' ? 'dev' : 'start'
  const command = IS_WIN ? windowsCommand(script) : { command: 'npm', args: ['run', script] }

  addSystem(`กำลังสตาร์ทโหมด ${state.mode.toUpperCase()} (npm run ${script}) · พอร์ต ${APP_PORT}`)
  state.status = 'starting'
  state.intentionalStop = false
  state.lastAction = { action: 'start', time: now(), mode: state.mode }

  const child = spawn(command.command, command.args, {
    cwd: ROOT,
    env: { ...process.env, PORT: String(APP_PORT), FORCE_COLOR: '0', NO_COLOR: '1' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  state.child = child
  state.pid = child.pid ?? null
  state.startedAt = now()

  child.stdout.on('data', (chunk) => addLog('out', chunk.toString()))
  child.stderr.on('data', (chunk) => addLog('err', chunk.toString()))

  child.on('error', (error) => {
    addLog('err', `spawn error: ${error.message}`)
    state.status = 'error'
    state.lastExit = { code: null, signal: null, time: now() }
    state.child = null
    addHistory('start', false, error.message)
    broadcastState()
  })

  child.on('exit', (code, signal) => {
    const wasIntentional = state.intentionalStop
    addSystem(`โปรเซสออกแล้ว (code=${code ?? '-'} signal=${signal ?? '-'})`)
    state.lastExit = { code, signal, time: now() }
    state.child = null
    state.pid = null
    state.startedAt = null
    state.memoryMB = null
    if (state.status !== 'stopping') {
      state.status = code === 0 || wasIntentional ? 'stopped' : 'error'
    } else {
      state.status = 'stopped'
    }
    addHistory(
      wasIntentional ? 'stop' : 'exit',
      wasIntentional || code === 0,
      wasIntentional ? 'หยุดเซิร์ฟเวอร์ตามคำสั่ง' : `โปรเซสออกเอง (code ${code ?? '-'})`,
    )
    broadcastState()

    if (!wasIntentional && config.autoRestart && state.restarts < 3) {
      state.restarts += 1
      addSystem(`Auto-restart ครั้งที่ ${state.restarts}/3 ในอีก 2 วินาที`)
      setTimeout(() => {
        try {
          spawnApp()
        } catch (error) {
          addSystem(`Auto-restart ไม่สำเร็จ: ${error.message}`)
          state.status = 'error'
        }
      }, 2000)
    }
  })

  addHistory('start', true, `เริ่มโหมด ${state.mode} · pid ${child.pid ?? '—'}`)
  broadcastState()
}

function killTree(pid, force) {
  if (!pid) return
  if (IS_WIN) {
    const args = force ? ['/PID', String(pid), '/T', '/F'] : ['/PID', String(pid), '/T']
    execFile('taskkill', args, { timeout: 8000 }, () => {})
    return
  }
  try {
    process.kill(pid, force ? 'SIGKILL' : 'SIGTERM')
  } catch {
    /* already gone */
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForExit(timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (!state.child || state.child.exitCode !== null) return true
    await wait(150)
  }
  return false
}

async function stop({ force = false } = {}) {
  if (state.buildProcess) {
    throw new Error('กำลัง build อยู่ — หยุด build ก่อน'
    )
  }
  const child = state.child
  if (!child) {
    const portPid = await findPortPid(APP_PORT)
    if (portPid) {
      addSystem(`พบโปรเซสภายนอก PID ${portPid} บนพอร์ต ${APP_PORT} — กำลังปิดแบบ ${force ? 'บังคับ' : 'ปกติ'}`)
      killTree(portPid, force)
      addHistory(force ? 'force-stop' : 'stop', true, `ปิดโปรเซสภายนอก PID ${portPid}`)
      await wait(600)
      state.portPid = await findPortPid(APP_PORT)
      await checkHealth()
      state.status = state.health ? 'external' : 'stopped'
      broadcastState()
      return
    }
    state.status = 'stopped'
    addSystem('ไม่มีโปรเซสให้หยุด')
    throw new Error('เซิร์ฟเวอร์ไม่ได้ทำงานอยู่')
  }

  state.intentionalStop = true
  state.status = 'stopping'
  state.stoppingAt = now()
  state.lastAction = { action: force ? 'force-stop' : 'stop', time: now(), mode: state.mode }
  addSystem(force ? 'บังคับปิดเซิร์ฟเวอร์ (force)' : 'กำลังหยุดเซิร์ฟเวอร์อย่างนุ่มนวล')
  killTree(child.pid, force)

  let exited = await waitForExit(force ? 2500 : 4500)
  if (!exited) {
    addSystem('โปรเซสไม่ยอมออก — ใช้ taskkill /F แทน')
    killTree(child.pid, true)
    exited = await waitForExit(2500)
  }
  if (!exited) {
    state.status = 'error'
    addSystem('หยุดโปรเซสไม่สำเร็จ')
    addHistory('stop', false, 'หยุดโปรเซสไม่สำเร็จ')
    broadcastState()
    throw new Error('หยุดเซิร์ฟเวอร์ไม่สำเร็จ')
  }

  state.child = null
  state.pid = null
  state.startedAt = null
  state.portPid = await findPortPid(APP_PORT)
  await checkHealth()
  state.status = state.health ? 'external' : 'stopped'
  addHistory(force ? 'force-stop' : 'stop', true, 'หยุดเซิร์ฟเวอร์แล้ว')
  addSystem('หยุดเซิร์ฟเวอร์แล้ว')
  broadcastState()
}

async function restart() {
  const wasRunning = Boolean(state.child) || Boolean(await findPortPid(APP_PORT))
  if (wasRunning) {
    try {
      await stop({ force: false })
    } catch {
      /* continue if already down */
    }
  }
  await wait(400)
  spawnApp()
}

function startBuild() {
  if (state.buildProcess) throw new Error('กำลัง build อยู่แล้ว')
  addSystem('เริ่ม production build (npm run build)')
  state.lastAction = { action: 'build', time: now(), mode: state.mode }
  const command = IS_WIN ? windowsCommand('build') : { command: 'npm', args: ['run', 'build'] }
  const child = spawn(command.command, command.args, {
    cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  state.buildProcess = child
  const started = Date.now()
  child.stdout.on('data', (chunk) => addLog('out', chunk.toString()))
  child.stderr.on('data', (chunk) => addLog('err', chunk.toString()))
  child.on('error', (error) => {
    addLog('err', `build error: ${error.message}`)
    state.buildProcess = null
    addHistory('build', false, error.message)
    broadcastState()
  })
  child.on('exit', (code) => {
    state.buildProcess = null
    const seconds = Math.round((Date.now() - started) / 100) / 10
    addSystem(`build เสร็จสิ้น (code=${code ?? '-'}, ${seconds}s)`)
    addHistory('build', code === 0, code === 0 ? `build สำเร็จใน ${seconds}s` : `build ล้มเหลว (code ${code})`)
    broadcastState()
  })
  addHistory('build', true, 'เริ่ม build')
  broadcastState()
}

function killPort() {
  if (!state.portPid) throw new Error('ไม่พบโปรเซสที่ยึดพอร์ตอยู่')
  const pid = state.portPid
  addSystem(`บังคับปิดโปรเซส PID ${pid} ที่ยึดพอร์ต ${APP_PORT}`)
  killTree(pid, true)
  state.portPid = null
  if (state.child) {
    state.child = null
    state.pid = null
  }
  state.status = 'stopped'
  state.health = null
  addHistory('kill-port', true, `ปิด PID ${pid} บนพอร์ต ${APP_PORT}`)
  setTimeout(async () => {
    await checkHealth()
    state.status = state.health ? 'external' : 'stopped'
    broadcastState()
  }, 800)
  broadcastState()
}

async function preflight() {
  const checks = []
  checks.push({
    id: 'node',
    label: 'Node.js พร้อมใช้งาน',
    ok: Number(process.versions.node.split('.')[0]) >= 20,
    detail: process.version,
  })

  let npmVersion = '—'
  try {
    const { stdout } = await execFileAsync(IS_WIN ? 'cmd.exe' : 'npm', IS_WIN ? ['/d', '/s', '/c', 'npm -v'] : ['-v'], {
      timeout: 6000,
    })
    npmVersion = stdout.trim()
  } catch {
    /* ignore */
  }
  checks.push({ id: 'npm', label: 'npm พร้อมใช้งาน', ok: npmVersion !== '—', detail: npmVersion })

  const distExists = fs.existsSync(path.join(ROOT, 'dist', 'index.html'))
  checks.push({
    id: 'dist',
    label: 'มี production build',
    ok: distExists,
    detail: distExists ? 'dist/index.html พร้อม' : 'ยังไม่มี — กด Build ก่อน deploy',
  })

  let writable = false
  try {
    const probe = path.join(DATA_DIR, `.probe-${Date.now()}`)
    fs.writeFileSync(probe, 'ok')
    fs.unlinkSync(probe)
    writable = true
  } catch {
    writable = false
  }
  checks.push({
    id: 'data',
    label: 'โฟลเดอร์ data เขียนได้',
    ok: writable,
    detail: writable ? 'SQLite พร้อมบันทึก' : 'ตรวจสิทธิ์การเขียน',
  })

  const portPid = await findPortPid(APP_PORT)
  checks.push({
    id: 'port',
    label: `พอร์ต ${APP_PORT} ว่าง หรือเป็นของเรา`,
    ok: !portPid || Boolean(state.child),
    detail: portPid ? `มีโปรเซส PID ${portPid} ใช้งานอยู่` : 'ว่าง',
  })

  const health = await checkHealth()
  checks.push({
    id: 'api',
    label: 'API /api/health ตอบสนอง',
    ok: Boolean(health),
    detail: health ? `ok · uptime ${health.uptimeSeconds}s` : 'ยังไม่ตอบสนอง',
  })

  const envPath = path.join(ROOT, '.env')
  checks.push({
    id: 'ai',
    label: 'AI Boost (ไม่บังคับ)',
    ok: Boolean(process.env.OPENAI_API_KEY),
    detail: process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY พร้อม' : 'ยังไม่ตั้งค่า — ฟีเจอร์อื่นใช้ได้',
    optional: true,
  })

  checks.push({
    id: 'envfile',
    label: 'ไฟล์ .env',
    ok: fs.existsSync(envPath),
    detail: fs.existsSync(envPath) ? '.env พร้อม' : 'ยังไม่มี (คัดลอกจาก .env.example)',
    optional: true,
  })

  return {
    checks,
    passed: checks.filter((check) => check.ok || check.optional).length,
    total: checks.length,
    dataPath: path.join(DATA_DIR, 'promptroom.db'),
    root: ROOT,
    time: now(),
  }
}

/* ---------------- express ---------------- */

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '200kb' }))
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')
  next()
})
app.use(express.static(PUBLIC, { index: 'index.html' }))

const asyncRoute = (handler) => (req, res) => {
  handler(req, res).catch((error) => {
    res.status(500).json({ error: error.message || 'เกิดข้อผิดพลาด' })
  })
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'promptroom-control-center', uptimeSeconds: Math.round(process.uptime()), time: now() })
})

app.get('/api/state', (_req, res) => {
  res.json(stateSnapshot())
})

app.get('/api/logs', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 400, 1), MAX_LOGS)
  res.json({ logs: state.logs.slice(-limit) })
})

app.get('/api/logs/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write(`event: hello\ndata: ${JSON.stringify({ time: now() })}\n\n`)
  const recent = state.logs.slice(-250)
  for (const entry of recent) res.write(`data: ${JSON.stringify(entry)}\n\n`)
  state.sseClients.add(res)
  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      /* ignore */
    }
  }, 20000)
  req.on('close', () => {
    clearInterval(keepAlive)
    state.sseClients.delete(res)
  })
})

app.get('/api/logs/download', (_req, res) => {
  const body = state.logs
    .map((entry) => `${entry.time} [${entry.stream}] ${entry.text}`)
    .join('\r\n')
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="promptroom-control.log"')
  res.send(body)
})

app.post('/api/logs/clear', (_req, res) => {
  state.logs = []
  addSystem('ล้างบันทึกแล้ว')
  res.json({ ok: true })
})

app.post('/api/start', (_req, res) => {
  try {
    spawnApp()
    res.json({ ok: true, state: stateSnapshot() })
  } catch (error) {
    res.status(409).json({ error: error.message })
  }
})

app.post('/api/stop', asyncRoute(async (_req, res) => {
  await stop({ force: false })
  res.json({ ok: true, state: stateSnapshot() })
}))

app.post('/api/restart', asyncRoute(async (_req, res) => {
  await restart()
  res.json({ ok: true, state: stateSnapshot() })
}))

app.post('/api/force-stop', asyncRoute(async (_req, res) => {
  await stop({ force: true })
  res.json({ ok: true, state: stateSnapshot() })
}))

app.post('/api/build', (_req, res) => {
  try {
    startBuild()
    res.json({ ok: true, state: stateSnapshot() })
  } catch (error) {
    res.status(409).json({ error: error.message })
  }
})

app.post('/api/kill-port', (_req, res) => {
  try {
    killPort()
    res.json({ ok: true, state: stateSnapshot() })
  } catch (error) {
    res.status(409).json({ error: error.message })
  }
})

app.get('/api/checks', asyncRoute(async (_req, res) => {
  res.json(await preflight())
}))

app.post('/api/settings', (req, res) => {
  const { mode, autoRestart } = req.body ?? {}
  if (mode && !['prod', 'dev'].includes(mode)) {
    return res.status(400).json({ error: 'mode ต้องเป็น prod หรือ dev' })
  }
  if (mode && state.child) {
    return res.status(409).json({ error: 'หยุดเซิร์ฟเวอร์ก่อนสลับโหมด' })
  }
  if (mode) state.mode = mode
  if (typeof autoRestart === 'boolean') config.autoRestart = autoRestart
  saveConfig()
  addHistory('settings', true, `โหมด ${state.mode} · auto-restart ${config.autoRestart ? 'เปิด' : 'ปิด'}`)
  broadcastState()
  res.json({ ok: true, state: stateSnapshot() })
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'ไม่พบ API นี้' })
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'))
})

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' })
  }
  console.error('[control]', error)
  if (!res.headersSent) res.status(500).json({ error: 'เกิดข้อผิดพลาดใน Control Center' })
})

// graceful shutdown of the control center itself
async function shutdown() {
  addSystem('Control Center กำลังปิดตัว')
  for (const client of state.sseClients) {
    try {
      client.end()
    } catch {
      /* ignore */
    }
  }
  if (state.child) killTree(state.child.pid, true)
  if (state.buildProcess) killTree(state.buildProcess.pid, true)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const server = app.listen(CONTROL_PORT, '127.0.0.1', () => {
  addSystem(`Control Center พร้อมที่ http://localhost:${CONTROL_PORT}`)
  addSystem(`เฝ้าดูแอปที่พอร์ต ${APP_PORT} · โหมดเริ่มต้น ${state.mode}`)
  console.log(`\n  PROMPTROOM CONTROL CENTER`)
  console.log(`  → http://localhost:${CONTROL_PORT}`)
  console.log(`  app port: ${APP_PORT} · mode: ${state.mode}\n`)
  poll()
  setInterval(poll, 2500)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`พอร์ต ${CONTROL_PORT} ถูกใช้งานอยู่ — ตั้ง CONTROL_PORT เพื่อเปลี่ยนพอร์ต`)
  } else {
    console.error(error)
  }
  process.exit(1)
})
