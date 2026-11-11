# PROMPTROOM® — Creative & Art Direction Prompt Engine

เว็บแอปfullstack ภาษาไทยสำหรับสร้าง **พรอมป์ตงานสร้างสรรค์และ art direction** ตั้งแต่ภาพเดี่ยว ซีรีส์ภาพ วิดีโอ แคมเปญ งานดีไซน์ ไปจนถึงการดีบักและแปลงพรอมป์ตข้ามเครื่องมือ AI

- Frontend: Vite + React 18 + React Router 6 + TypeScript
- Backend: Express 4 + `node:sqlite` (ไม่ต้องคอมไพล์ native module)
- Prompt engine ใช้ร่วมกันทั้ง frontend และ backend (`shared/`) — ผลลัพธ์ deterministic
- ฟอนต์ **Prompt** ทั้งเว็บ รวมถึงหน้า Control Center และบล็อกโค้ด
- Local Control Center สำหรับ start / stop / restart / force-stop / ดู log / build ก่อนขึ้นโฮสต์จริง

---

## ฟีเจอร์หลัก

| หน้า | รายละเอียด |
| --- | --- |
| `/` Home | ภาพรวมเครื่องมือ ทางลัดเข้าสตูดิโอ และพรอมป์ตตัวอย่าง |
| `/studio` | วิซาร์ดสร้างพรอมป์ต 3 ขั้นตอน พร้อมตัวเลือกงาน, เครื่องมือ, สไตล์, พาเลตต์, อัตราส่วน |
| `/templates` | เทมเพลตคัดสรร 10 ชุด ใช้เป็นจุดเริ่มต้นได้ทันที |
| `/library` | คลังพรอมป์ตที่บันทึกไว้ใน SQLite (ค้นหา, ทำซ้ำ, ลบ) |
| `/brands` | แบรนด์โน้ต/โทนเสียง ที่ใช้เป็น context ของงาน |
| `/guide` | คู่มือการเขียนพรอมป์ตและโครงสร้างผลลัพธ์ |

### UX ที่เพิ่มเข้ามา

- Command palette (`Ctrl/Cmd + K`) ค้นหาหน้า เทมเพลต เครื่องมือ และคำสั่ง
- Workspace switcher แยกคลังตามทีม/ลูกค้า พร้อมจำรายการล่าสุด
- Export พรอมป์ตเป็น Markdown / JSON / CSV shot list / Plain text
- Library: ค้นหา กรอง เรียงลำดับ มุมมอง grid/list รายการโปรด ปุ่มจัดการ และ deep link `?prompt=`
- Templates: preview พรอมป์ตที่ระบบสร้างจริงก่อนใช้
- Mobile dock, scroll progress, skeleton loading, empty/error states และ reduced-motion support

ผลลัพธ์จากสตูดิโอประกอบด้วย

- Master prompt โครงสร้าง `ROLE / GOAL / CONTEXT / VISUAL DIRECTION / DELIVERABLES / CONSTRAINTS / CHECKS`
- 3–4 creative routes ให้เลือกทิศทาง
- ตารางซีรีส์/ช็อต (shot list) พร้อม negative prompt
- พารามิเตอร์เฉพาะเครื่องมือ (Midjourney, DALL·E, Stable Diffusion, Firefly, Runway, Sora ฯลฯ)
- ชุดตรวจสอบคุณภาพ (checks) และ JSON สำหรับนำไปใช้ต่อ

---

## โครงสร้างโปรเจกต์

```
D:\PE-Web
├─ control-center/        # Local Control Center (Express + HTML/CSS/JS)
│  ├─ server.mjs
│  └─ public/
├─ data/                  # SQLite + runtime state (ไม่ commit)
│  └─ promptroom.db
├─ dist/                  # production build (ไม่ commit)
├─ server/                # Express API + static SPA
│  ├─ index.ts            # entry point / start server
│  ├─ app.ts              # createApp() + routes + error handling
│  ├─ validate.ts         # request validation (ข้อความภาษาไทย)
│  ├─ rate-limit.ts       # in-memory rate limiter
│  ├─ db.ts               # SQLite queries + seed
│  └─ normalize.ts
├─ tests/
│  └─ api.test.ts         # node:test integration tests
├─ scripts/
│  └─ backup-db.mjs       # consistent SQLite backup (VACUUM INTO)
├─ shared/                # prompt engine, options, templates ที่ใช้ร่วมกัน
│  ├─ engine.ts
│  ├─ options.ts
│  ├─ templates.ts
│  └─ types.ts
├─ src/                   # React app
│  ├─ pages/
│  ├─ components/
│  ├─ lib/
│  ├─ styles.css          # design system เดิม
│  └─ enhance.css         # UX enhancement layer
├─ ecosystem.config.cjs   # PM2 process manager
├─ Dockerfile
├─ index.html
├─ package.json
├─ vite.config.ts
└─ tsconfig.json
```

---

## สิ่งที่ต้องมี

- **Node.js 24 ขึ้นไป** (แนะนำ 24 หรือ 26) — ต้องมี `node:sqlite`
- npm 10+
- Windows / macOS / Linux

ตรวจเวอร์ชัน

```powershell
node -v
npm -v
```

---

## เริ่มใช้งานครั้งแรก

```powershell
cd D:\PE-Web
Copy-Item .env.example .env
npm install
npm run build
npm start
```

เปิดเว็บที่ **http://localhost:8787**

> ถ้าไม่สร้าง `.env` ก็รันได้ ระบบจะใช้ค่าเริ่มต้น `PORT=8787` และปิด AI Boost

---

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | รัน API (tsx watch) + Vite พร้อมกันที่ 5173 |
| `npm run dev:server` | รันเฉพาะ API ที่ 8787 |
| `npm run dev:client` | รันเฉพาะ Vite ที่ 5173 |
| `npm run build` | typecheck แล้วสร้าง `dist/` |
| `npm start` | เสิร์ฟ production ที่ 8787 (ต้องมี `dist/`) |
| `npm test` | รัน API integration tests ด้วย `node:test` |
| `npm run typecheck` | ตรวจ TypeScript อย่างเดียว |
| `npm run backup` | สำรอง SQLite ไปที่ `data/backups/` (เก็บ 14 ชุดล่าสุด) |
| `npm run control` | เปิด Local Control Center ที่ 9090 |

หรือดับเบิลคลิก `start-control-center.bat` / `start-app.bat` บน Windows

---

## Local Control Center

เปิดหน้าต่างใหม่แล้วรัน

```powershell
npm run control
```

เข้า **http://localhost:9090** (ผูกกับ `127.0.0.1` เท่านั้น)

สิ่งที่ทำได้

- **Start** เปิดเซิร์ฟเวอร์โหมด Production (`npm start`) หรือ Development (`npm run dev`)
- **Stop** ปิดอย่างนุ่มนวล แล้วรอให้ process tree ออก
- **Restart** หยุดแล้วเริ่มใหม่
- **Force Stop** ใช้ `taskkill /PID <pid> /T /F` ปิดทั้ง tree ทันที
- **Build production** รัน `npm run build` และสตรีม log
- **Kill port owner** เคลียร์โปรเซสที่ยึดพอร์ต 8787
- **Live logs** ผ่าน SSE พร้อมตัวกรอง, auto-scroll, ดาวน์โหลด, ล้าง log
- **Pre-flight** ตรวจ Node, npm, dist, สิทธิ์เขียน data, พอร์ต, health API, `.env`, AI key
- **Auto-restart** เมื่อโปรเซสล้ม สูงสุด 3 ครั้ง
- **Activity history** บันทึกทุกคำสั่งพร้อมเวลา

### พอร์ต

| ส่วน | ค่าเริ่มต้น | เปลี่ยนได้ด้วย |
| --- | --- | --- |
| เว็บแอป | 8787 | `PORT`, `APP_PORT` |
| Control Center | 9090 | `CONTROL_PORT` |
| Vite dev | 5173 | `vite.config.ts` |

> ถ้าเปลี่ยน `PORT` ต้องตั้ง `APP_PORT` ให้ตรงกันด้วย เพื่อให้ Control Center ตรวจสุขภาพถูกพอร์ต

---

## AI Boost (ไม่บังคับ)

เว็บทำงานได้ครบโดยไม่ใช้ AI Boost ถ้าต้องการเปิด ให้ใส่ค่าใน `.env`

```dotenv
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

รองรับ API ที่เข้ากันได้กับ OpenAI (เช่น OpenRouter, Groq, Ollama ที่เปิด OpenAI-compatible endpoint) โดยเปลี่ยน `OPENAI_BASE_URL`

---

## API ย่อ

ทุก request ที่เกี่ยวกับ workspace จะส่ง header `x-workspace` (ค่าเริ่มต้น `demo`)

| Method | Path | ใช้ทำอะไร |
| --- | --- | --- |
| GET | `/api/health` | สถานะเซิร์ฟเวอร์, uptime, AI enabled |
| GET | `/api/stats` | สถิติคลังพรอมป์ต/แบรนด์ |
| GET | `/api/templates` | รายการเทมเพลต |
| POST | `/api/generate` | สร้างพรอมป์ตแบบเต็มและบันทึก |
| POST | `/api/generate/preview` | สร้างพรอมป์ตแบบไม่บันทึก |
| GET | `/api/prompts` | ค้นหาคลังพรอมป์ต |
| GET | `/api/prompts/:id` | ดูรายการเดียว |
| PATCH | `/api/prompts/:id` | เปลี่ยนชื่อ / favorite |
| DELETE | `/api/prompts/:id` | ลบ |
| POST | `/api/prompts/:id/duplicate` | ทำซ้ำ |
| GET | `/api/brands` | รายการแบรนด์ |
| POST | `/api/brands` | เพิ่มแบรนด์ |
| PATCH | `/api/brands/:id` | แก้ไขแบรนด์ |
| DELETE | `/api/brands/:id` | ลบแบรนด์ |
| POST | `/api/boost` | ปรับพรอมป์ตด้วย AI (ต้องมีคีย์) |

### Validation และ rate limit

- ทุก endpoint ที่รับ body จะตอบ `400` พร้อมข้อความภาษาไทยเมื่อข้อมูลไม่ถูกต้อง
- JSON ที่ผิดรูปแบบตอบ `400` และ body เกิน 1MB ตอบ `413`
- `/api/generate` 30 ครั้ง/นาที, `/api/generate/preview` 60 ครั้ง/นาที, `/api/boost` 12 ครั้ง/นาที (แยกตาม IP + workspace)
- เมื่อเกินจะตอบ `429` พร้อม header `Retry-After`; ปิดด้วย `RATE_LIMIT_DISABLED=1` สำหรับการทดสอบ

ตัวอย่าง

```powershell
curl http://localhost:8787/api/health
```

---

## ข้อมูลและฐานข้อมูล

- ฐานข้อมูล: `data/promptroom.db` (SQLite ผ่าน `node:sqlite`)
- Workspace เริ่มต้น `demo` จะถูก seed ตัวอย่างให้อัตโนมัติ
- ลบไฟล์ฐานข้อมูลเพื่อเริ่มใหม่ได้ แต่จะเสียรายการที่บันทึกไว้
- `data/control-center.json` เก็บโหมดและ auto-restart ของ Control Center

### สำรองข้อมูล

```powershell
npm run backup          # เก็บ 14 ชุดล่าสุดใน data/backups/
node scripts/backup-db.mjs 30
```

สคริปต์ใช้ `VACUUM INTO` จึงได้ snapshot ที่ consistent แม้เซิร์ฟเวอร์กำลังทำงาน

ตั้งเวลาบน Windows Task Scheduler หรือ cron:

```cron
0 2 * * * cd /srv/promptroom && node scripts/backup-db.mjs 14
```

กู้คืน: หยุดเซิร์ฟเวอร์ → คัดลอกไฟล์สำรองมาทับ `data/promptroom.db` (ลบ `-wal`/`-shm` เก่าด้วย) → เริ่มเซิร์ฟเวอร์ใหม่

---

## ขึ้นโฮสต์จริง

### 1. เตรียม environment

```dotenv
NODE_ENV=production
PORT=8787
HOST=0.0.0.0
DATA_DIR=/srv/promptroom/data
OPENAI_API_KEY=            # ไม่ใส่ก็ได้
```

- ต้องมี **persistent disk** mount ที่ `DATA_DIR`
- ใช้ Node.js 24+ (ต้องมี `node:sqlite`)

### 2. Build และรัน

```bash
npm ci
npm run build
npm test
npm start
```

ตรวจ SPA fallback ว่า deep link เปิดได้: `/studio`, `/library?prompt=<id>`

### 3. Process manager

**PM2**

```bash
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

**systemd** (ตัวอย่าง `/etc/systemd/system/promptroom.service`)

```ini
[Unit]
Description=PROMPTROOM
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/promptroom
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=8787
Environment=HOST=127.0.0.1
Environment=DATA_DIR=/srv/promptroom/data

[Install]
WantedBy=multi-user.target
```

**Docker**

```bash
docker build -t promptroom .
docker run -d --name promptroom -p 127.0.0.1:8787:8787 \
  -v promptroom-data:/app/data --env-file .env promptroom
```

### 4. Reverse proxy + HTTPS

ให้ Node ฟังเฉพาะ `127.0.0.1` แล้วให้ Caddy/Nginx เป็นหน้าบ้าน

Caddy:

```caddyfile
prompt.example.com {
  encode gzip
  reverse_proxy 127.0.0.1:8787
}
```

Nginx:

```nginx
server {
  listen 443 ssl http2;
  server_name prompt.example.com;

  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 90s;   # AI Boost มี timeout 45s
  }
}
```

### 5. ความปลอดภัย

- **ห้าม deploy `control-center/`** ขึ้นเซิร์ฟเวอร์สาธารณะ — มันสั่ง start/stop process ได้
- Control Center ผูกกับ `127.0.0.1` เสมอ ถ้าต้องเข้าจากเครื่องอื่นให้ใช้ SSH tunnel
- เปิด HTTPS และตั้ง backup รายวัน
- จำกัดขนาด body ที่ reverse proxy ให้สอดคล้องกับ 1MB ของแอป

แพลตฟอร์มที่รองรับ Node.js 24+ และ persistent disk เช่น VPS, Railway, Render, Fly.io

---

## แก้ปัญหาที่พบบ่อย

**พอร์ต 8787 ถูกยึด**

```powershell
Get-NetTCPConnection -LocalPort 8787 -State Listen | Select-Object OwningProcess
```

หรือกด **Kill port owner** ใน Control Center

**ขึ้น `Cannot find module 'node:sqlite'`**
อัพเกรด Node.js เป็น 24 ขึ้นไป

**เปิดเว็บแล้วเจอ 404 / หน้าว่าง**
ยังไม่มี `dist/` ให้รัน `npm run build` ก่อน `npm start`

**ฟอนต์ไม่โหลด**
หน้าเว็บเรียก Google Fonts ต้องต่ออินเทอร์เน็ต ถ้าออฟไลน์ให้โหลดไฟล์ Prompt มา host เองแล้วแก้ `@font-face`

**AI Boost ขึ้น 503**
ยังไม่ได้ตั้ง `OPENAI_API_KEY` ใน `.env` แล้วรีสตาร์ทเซิร์ฟเวอร์
