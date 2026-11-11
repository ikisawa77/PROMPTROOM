#!/usr/bin/env node
/**
 * สำรองฐานข้อมูล SQLite แบบ consistent snapshot ด้วย VACUUM INTO
 * ใช้งาน: node scripts/backup-db.mjs [จำนวนสำรองที่เก็บไว้]
 * Windows Task Scheduler / cron ตัวอย่าง:
 *   0 2 * * *  cd /srv/promptroom && node scripts/backup-db.mjs 14
 */
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

try {
  process.loadEnvFile()
} catch {
  /* .env is optional */
}

const keep = Math.max(1, Number(process.argv[2]) || 14)
const dataDir = process.env.DATA_DIR || path.resolve('data')
const source = process.env.DB_PATH || path.join(dataDir, 'promptroom.db')
const backupsDir = path.join(dataDir, 'backups')

if (!fs.existsSync(source)) {
  console.error(`[backup] ไม่พบฐานข้อมูล: ${source}`)
  process.exit(1)
}

fs.mkdirSync(backupsDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const target = path.join(backupsDir, `promptroom-${stamp}.db`)

const db = new DatabaseSync(source)
try {
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
} finally {
  db.close()
}

const files = fs
  .readdirSync(backupsDir)
  .filter((name) => /^promptroom-.*\.db$/.test(name))
  .map((name) => ({ name, time: fs.statSync(path.join(backupsDir, name)).mtimeMs }))
  .sort((a, b) => b.time - a.time)

for (const file of files.slice(keep)) {
  fs.rmSync(path.join(backupsDir, file.name), { force: true })
  console.log(`[backup] ลบสำรองเก่า ${file.name}`)
}

const size = (fs.statSync(target).size / 1024).toFixed(1)
console.log(`[backup] สำรองแล้ว ${target} (${size} KB) · เก็บล่าสุด ${Math.min(files.length, keep)} ชุด`)
