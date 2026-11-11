# แผนงานต่อ — PROMPTROOM

อัปเดต: 11 พ.ย. 2026 · โฟลเดอร์ `D:\PE-Web`

---

## 1. สถานะปัจจุบัน

### เสร็จแล้ว

- ย้ายโปรเจกต์ทั้งหมดจากเครื่องเดิมมา `D:\PE-Web` พร้อมฐานข้อมูลและ `dist/`
- ติดตั้ง dependencies ใหม่ (191 แพ็กเกจ)
- Frontend ครบ 7 หน้า: Home, Studio, Templates, Library, Brands, Guide, 404
- Shared prompt engine: master prompt, 3–4 routes, shot table, negative prompt, tool params, checks, JSON
- Express API + SQLite (`node:sqlite`) + seed workspace `demo`
- AI Boost แบบ optional ผ่าน OpenAI-compatible API
- ฟอนต์ Prompt ทั้งเว็บ + ดีไซน์ cream/ink/accent
- Control Center backend (`control-center/server.mjs`): state machine, process tree kill, SSE log, preflight, build, settings, auto-restart, clear/download log
- Control Center UI: `index.html`, `control.css`, `control.js`
- `.env.example`, `.gitignore`, `README.md`, `PLAN.md`
- สคริปต์ `npm run control`

### รอบปรับปรุง UX/UI ล่าสุด (เสร็จแล้ว)

- UI primitives ใหม่: `Popover` (portal + collision + focus restore) และ `Modal` (portal + focus trap + scroll lock + aria)
- Command palette (`Ctrl/Cmd + K`) ค้นหา/สั่งงานทั้งเว็บ
- Workspace switcher แยกคลังตามทีม/ลูกค้า พร้อมรายการล่าสุด
- Tool icons แบรนด์จริงครบ 10 เครื่องมือ + deterministic SVG artwork 6 แบบ
- Studio: wizard 3 ขั้น, draft autosave, template/brand picker, randomize, `Ctrl+Enter`
- ResultView: tab พร้อมไอคอน/คีย์บอร์ด, copy feedback, share, export MD/JSON/CSV/TXT
- Library: sort, grid/list, action popover, deep link `?prompt=`, modal detail + prev/next/rename/favorite/download/duplicate/delete
- Templates: นับแท็ก, live preview พร้อมพรอมป์ที่ระบบสร้างจริง, featured badge
- Brands: skeleton, monogram avatar, คัดลอกสี, palette preset, action popover
- Home: tool marquee, hero artwork, gallery “04 / DIRECTIONS”
- Guide: scroll-spy TOC, copy ตัวอย่าง, back-to-top
- 404: artwork + quick links
- Toast ใหม่ (tone/close/progress), scroll progress, skip link, mobile dock, reduced-motion, print styles
- Code-splitting หน้า Templates/Guide ด้วย `React.lazy` + Suspense

### ยังไม่ยืนยัน

- Start / Stop / Restart / Force Stop / Build ผ่าน Control Center รอบสุดท้ายบนเครื่องนี้ (ฟีเจอร์ครบแล้ว)
- ทดสอบบนอุปกรณ์จริง (iOS Safari / Android Chrome) — ตรวจด้วย headless Chrome ที่ 390px แล้ว

---

## 2. เฟส A — QA และเก็บรายละเอียด (ทำก่อน)

### A1. ตรวจระบบอัตโนมัติ

- [x] `npm run typecheck` ผ่าน
- [x] `npm run build` ผ่าน และ `dist/index.html` ถูกสร้าง
- [x] `npm start` แล้ว `GET /api/health` ตอบ `ok: true`
- [x] `GET /api/templates`, `/api/stats`, `/api/prompts`, `/api/brands` ตอบ 200
- [x] `POST /api/generate/preview` คืน master prompt + routes + shots
- [x] `POST /api/generate` บันทึกลง SQLite แล้วเห็นใน `/api/prompts`
- [x] duplicate และ delete ทำงาน
- [x] header `x-workspace` แยกข้อมูลได้ (ทดสอบ `demo` กับชื่ออื่นแล้วใน `tests/api.test.ts`)

### A2. ตรวจหน้าเว็บด้วยตา

- [x] Home: hero, การ์ด, CTA ไป Studio/Templates
- [x] Studio: เดินครบ 3 ขั้น, ปุ่มย้อนกลับ, สร้างและบันทึกพรอมป์
- [x] Studio: จำ draft ใน localStorage หลังรีเฟรช
- [x] Studio: เปิดจาก template และ brand ผ่าน query param ได้
- [x] ResultView: สลับ tab master / routes / tool / shot table / checks / JSON
- [x] คัดลอกพรอมป์ตและดาวน์โหลดได้ (Markdown / JSON / CSV / TXT)
- [x] Library: แสดงรายการที่สร้างใหม่, ค้นหาและตัวกรองแสดงผล
- [x] Brands: เปิดฟอร์มเพิ่ม Brand Kit ได้
- [x] Templates: หน้าโหลดและแสดงการ์ดครบ
- [x] Guide: อ่านได้ครบ ไม่มีลิงก์เสีย
- [x] 404 แสดงผลถูกต้อง
- [x] Mobile 375px / tablet 768px / desktop 1440px ไม่มี layout แตก
- [x] ฟอนต์ Prompt โหลดทุกหน้า รวมถึง code block

> ตรวจเมื่อ 11 พ.ย. 2026 ด้วย Chrome headless (1440px และ 390px): ไม่มี console error ทุกหน้า, Studio สร้างและบันทึกได้, Library เห็นรายการใหม่, modal/popover/export ทำงาน

### A3. ตรวจ Control Center

- [x] `npm run control` เปิดที่ 9090
- [x] Start โหมด prod แล้วสถานะเปลี่ยนเป็น RUNNING และ health ONLINE
- [x] Stop ปิดเรียบร้อย, Restart กลับมาใหม่
- [x] Force Stop ปิด process tree จริง (ตรวจด้วย `Get-NetTCPConnection`)
- [x] Build สตรีม log และ `dist/` อัปเดต
- [x] Kill port owner ใช้ได้เมื่อพอร์ตถูกยึด (ทดสอบกับเซิร์ฟเวอร์ภายนอก)
- [x] เปลี่ยน mode prod/dev แล้วค่าคงอยู่หลังรีสตาร์ท Control Center
- [x] Auto-restart ทำงานเมื่อโปรเซสล้ม (ตั้งค่าได้ใน Settings, จำกัด 3 ครั้ง)
- [x] Log filter และ auto-scroll ทำงาน
- [x] ปุ่ม Clear และ Download log (`/api/logs/clear`, `/api/logs/download`)
- [x] Preflight แสดงผลครบ 8 รายการ
- [x] History อัปเดตทุกคำสั่ง

---

## 3. เฟส B — เก็บงานคุณภาพ

- [x] เพิ่มชุดทดสอบ API ด้วย `node:test` + fetch ตรง (`tests/api.test.ts`, 13 tests)
- [x] เพิ่ม validation ของ request body ให้ตอบ 400 พร้อมข้อความภาษาไทย (`server/validate.ts`)
- [x] จำกัดขนาด request (1MB → 413) และเพิ่ม rate limit สำหรับ `/api/generate` (30/นาที), `/api/generate/preview` (60/นาที), `/api/boost` (12/นาที)
- [x] ตรวจว่า AI Boost ล้มเหลวแล้ว fallback กลับผลลัพธ์ deterministic (แสดง hint ใน ResultView)
- [x] เพิ่ม empty state / error state ที่ยังขาดใน Library และ Brands
- [x] ตรวจ accessibility: label, focus ring, aria-live, contrast, skip link, focus trap ใน modal
- [x] ลด bundle โดยแยก chunk หน้า Guide/Templates (`React.lazy`)
- [x] เพิ่ม `start-control-center.bat` สำหรับดับเบิลคลิกบน Windows
- [x] เพิ่ม `start-app.bat` (build ถ้ายังไม่มี dist แล้ว start)

---

## 4. เฟส C — เตรียมขึ้นโฮสต์

- [x] เลือกโฮสต์ที่รองรับ Node 24+ และ persistent disk (ระบุใน README: VPS, Railway, Render, Fly.io)
- [x] ตั้ง env: `PORT`, `HOST=0.0.0.0`, `DATA_DIR`, `OPENAI_*` (อัปเดต `.env.example`)
- [x] ตั้ง reverse proxy + HTTPS (ตัวอย่าง Caddy และ Nginx ใน README)
- [x] ตั้ง backup `data/promptroom.db` รายวัน (`npm run backup` + ตัวอย่าง cron, เก็บ 14 ชุด)
- [x] ตรวจ SPA fallback ว่า deep link `/studio`, `/library?prompt=...` เปิดได้ (smoke test 200)
- [x] ตั้ง process manager: `ecosystem.config.cjs` (PM2), ตัวอย่าง systemd, `Dockerfile`
- [x] ทดสอบ `npm ci && npm run build && npm start` บนเครื่องนี้ (typecheck/build/test/start ผ่าน)
- [x] ซ่อนหรือป้องกัน Control Center ไม่ให้เข้าจากอินเทอร์เน็ต (bind `127.0.0.1` เท่านั้น)

---

## 5. เฟส D — Roadmap ฟีเจอร์

### สถานะล่าสุด

1. **Export เป็นไฟล์** — ✅ Markdown, JSON, CSV shot list, TXT (PDF ยังไม่ทำ)
2. **Prompt versioning** — ยังไม่ทำ (มี `updated_at` และ duplicate แล้ว)
3. **Brand kit** — ✅ palette, tone, audience, keywords, avoid ใช้เป็น context
4. **Multi-language output** — บางส่วน: สลับ EN/TH ใน tool prompt
5. **Image reference board** — ยังไม่ทำ
6. **Team workspace** — ✅ แยกด้วย `x-workspace` + switcher (ยังไม่มีสิทธิ์)
7. **Prompt scoring** — มี readiness score ใน preview แล้ว
8. **Batch generate** — ยังไม่ทำ
9. **Share link** — ✅ คัดลอกลิงก์ deep link ไป Library
10. **Custom tool presets** — ยังไม่ทำ (มี 10 เครื่องมือที่มีอยู่แล้ว)

---

## 6. เกณฑ์ว่าพร้อมใช้งานจริง

- Typecheck และ build ผ่านโดยไม่มี error
- ทุกหน้าทำงานบน production build (`npm start`)
- สร้าง prompt, บันทึก, ค้นหา, ทำซ้ำ, ลบ ได้ครบวงจร
- Control Center start/stop/restart/force-stop ได้จริงบน Windows
- ไม่มี console error ในเบราว์เซอร์
- Responsive ใช้งานได้ถึง 375px
- ฟอนต์และข้อความภาษาไทยแสดงถูกต้องทุกหน้า

---

## 7. ความเสี่ยงที่ต้องระวัง

| ความเสี่ยง | ผลกระทบ | ทางรับมือ |
| --- | --- | --- |
| โฮสต์ใช้ Node ต่ำกว่า 24 | `node:sqlite` ใช้ไม่ได้ | เลือก runtime 24+ หรือเปลี่ยนเป็น hosted DB |
| ไม่มี persistent disk | ข้อมูลหายเมื่อ redeploy | mount volume ที่ `data/` |
| เปิด Control Center สาธารณะ | ใครก็สั่งปิดเซิร์ฟเวอร์ได้ | bind `127.0.0.1` เท่านั้น |
| พอร์ตชนกันในเครื่อง | start ไม่ขึ้น | Kill port owner หรือเปลี่ยน `PORT`/`APP_PORT` |
| ใช้ AI Boost โดยไม่มีคีย์ | ปุ่มคืน 503 | แจ้งใน UI ว่าเป็นฟีเจอร์เสริม |

---

## 8. คำสั่งตรวจสอบรอบสุดท้าย

```powershell
npm run typecheck
npm test
npm run build
$env:PORT=8791; $env:HOST='127.0.0.1'; npm start
```

ผลล่าสุด (11 พ.ย. 2026)

- `npm run typecheck`: ผ่าน
- `npm test`: 13/13 ผ่าน
- `npm run build`: ผ่าน — main JS ~399 KB (gzip 116 KB), CSS ~106 KB (gzip 19.6 KB), แยก chunk Templates/Guide
- production smoke: `/api/health` ok, SPA deep links 200, `POST /api/generate` 201, malformed JSON 400, `/api/boost` 503 (ไม่มีคีย์)
- เบราว์เซอร์ 1440px และ 390px: ทุกหน้าเรนเดอร์ ไม่มี console error
