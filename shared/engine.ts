import type {
  GenerateResult,
  PromptInput,
  SeriesRow,
  ShotRow,
  Variation,
} from './types'
import {
  ASPECTS,
  CAMERAS,
  COMPOSITIONS,
  LENSES,
  LIGHTINGS,
  MEDIUMS,
  MOODS,
  PALETTES,
  RATIO_PIXELS,
  STYLES,
  TASKS,
  TOOLS,
  findOption,
  findTask,
  findTool,
} from './options'

type Overrides = Partial<
  Pick<PromptInput, 'style' | 'lighting' | 'palette' | 'composition' | 'lens' | 'mood' | 'camera'>
>

const BASE_NEGATIVE = [
  'low resolution',
  'blurry',
  'distorted anatomy',
  'extra fingers',
  'warped typography',
  'garbled text',
  'watermark',
  'logo artifacts',
  'plastic skin',
  'oversaturated colours',
  'duplicated objects',
  'cluttered composition',
]

const STYLE_NEGATIVE: Record<string, string[]> = {
  photoreal: ['illustration', '3d render', 'cartoon', 'painterly'],
  editorial: ['over-styled', 'stock-photo smile', 'busy background'],
  minimal: ['ornate detail', 'visual noise', 'uneven alignment'],
  cinematic: ['flat lighting', 'sitcom lighting', 'oversharpened'],
  illustrated: ['photorealistic', '3d render', 'muddy colours'],
  '3d': ['photograph', 'flat illustration', 'cheap plastic'],
  luxury: ['cheap materials', 'neon', 'discount aesthetic'],
  experimental: ['safe composition', 'corporate stock'],
  retro: ['modern minimal', 'digital sharpness'],
  brutalist: ['soft gradients', 'delicate serif', 'rounded corners'],
  organic: ['synthetic gloss', 'neon', 'industrial'],
  tech: ['organic texture', 'vintage grain', 'hand-drawn'],
}

const VIDEO_NEGATIVE = [
  'face morphing',
  'warped hands',
  'flickering',
  'jittery motion',
  'sudden cut',
  'inconsistent lighting',
  'floating objects',
]

const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
const uniq = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

function resolve(input: PromptInput) {
  return {
    task: findTask(input.task),
    tool: findTool(input.tool),
    medium: findOption(MEDIUMS, input.medium),
    style: findOption(STYLES, input.style),
    composition: findOption(COMPOSITIONS, input.composition),
    lighting: findOption(LIGHTINGS, input.lighting),
    palette: findOption(PALETTES, input.palette),
    lens: findOption(LENSES, input.lens),
    mood: findOption(MOODS, input.mood),
    camera: findOption(CAMERAS, input.camera),
    aspect: findOption(ASPECTS, input.aspect),
    ratio: RATIO_PIXELS[input.aspect] ?? RATIO_PIXELS['4:5'],
  }
}

function paletteClause(input: PromptInput, override?: string) {
  if (override) return override
  if (input.palette === 'custom' && clean(input.customPalette)) {
    return `custom colour palette of ${clean(input.customPalette)}`
  }
  const palette = findOption(PALETTES, input.palette)
  return palette.prompt ?? palette.en
}

export function buildNegative(input: PromptInput): string {
  const style = findOption(STYLES, input.style)
  const styleNegatives = STYLE_NEGATIVE[style.id] ?? []
  const user = clean(input.negatives)
  const avoid = clean(input.avoid)
  const list = [
    ...BASE_NEGATIVE,
    ...(input.task === 'video' ? VIDEO_NEGATIVE : []),
    ...styleNegatives,
    ...(user ? user.split(/[,;\n]/).map((item) => item.trim()) : []),
    ...(avoid ? avoid.split(/[,;\n]/).map((item) => item.trim()) : []),
  ]
  return uniq(list).slice(0, 28).join(', ')
}

function buildTitle(input: PromptInput): string {
  const core = clean(input.brief)
  const snippet = core.length > 52 ? `${core.slice(0, 52).trim()}…` : core
  const prefix = input.brand ? `${input.brand} — ` : ''
  return `${prefix}${snippet || findTask(input.task).th}`
}

function buildSummary(input: PromptInput): string {
  const { task, tool, aspect } = resolve(input)
  return `พรอมป์${task.th} · แนว${findOption(STYLES, input.style).th} · ${tool.name} · ${aspect.en} · ${input.variations} เส้นทาง`
}

export function buildToolPrompt(input: PromptInput, override: Overrides = {}): string {
  const medium = findOption(MEDIUMS, input.medium)
  const style = findOption(STYLES, override.style ?? input.style)
  const composition = findOption(COMPOSITIONS, override.composition ?? input.composition)
  const lighting = findOption(LIGHTINGS, override.lighting ?? input.lighting)
  const lens = findOption(LENSES, override.lens ?? input.lens)
  const mood = findOption(MOODS, override.mood ?? input.mood)
  const camera = findOption(CAMERAS, override.camera ?? input.camera)

  const parts: string[] = []
  if (clean(input.brief)) parts.push(clean(input.brief))
  if (input.brand) parts.push(`brand world: ${clean(input.brand)}`)
  parts.push(medium.prompt ?? medium.en)
  parts.push(style.prompt ?? style.en)

  if (input.task === 'design') {
    parts.push('poster-grade layout with a clear typographic hierarchy')
    parts.push('text-safe area reserved in the upper third')
    parts.push('print-ready margins and bleed awareness')
  }

  parts.push(composition.prompt ?? composition.en)
  parts.push(lighting.prompt ?? lighting.en)
  if (override.palette) {
    const paletteOption = findOption(PALETTES, override.palette)
    parts.push(paletteOption.prompt ?? paletteOption.en)
  } else {
    parts.push(paletteClause(input))
  }
  if (lens.prompt) parts.push(lens.prompt)
  parts.push(`${mood.prompt ?? mood.en}`)

  if (input.task === 'video') {
    parts.push(camera.prompt ?? camera.en)
    parts.push(`${input.duration}-second continuous shot`)
    parts.push('consistent subject identity and wardrobe across the clip')
    parts.push('no on-screen text')
  }

  if (input.message) parts.push(`visual message: ${clean(input.message)}`)
  if (input.audience) parts.push(`made for: ${clean(input.audience)}`)
  if (clean(input.extraNotes)) parts.push(clean(input.extraNotes))

  const seed = clean(input.seed)
  const params: string[] = []
  const ratio = input.aspect || '4:5'
  const px = RATIO_PIXELS[ratio] ?? RATIO_PIXELS['4:5']

  switch (input.tool) {
    case 'midjourney':
      params.push(`--ar ${ratio}`, '--v 6.1', '--style raw', `--stylize ${input.stylize}`)
      if (seed) params.push(`--seed ${seed}`)
      break
    case 'flux':
      params.push(`--ar ${ratio}`, '--guidance 3.5', '--steps 28')
      if (seed) params.push(`--seed ${seed}`)
      break
    case 'firefly':
      params.push(`--ar ${ratio}`, '--content-type photo', '--visual-intensity 7')
      break
    case 'ideogram':
      params.push(`--ar ${ratio}`, '--style realistic', '--magic-prompt off')
      break
    case 'stable-diffusion':
      params.push(
        `--ar ${ratio}`,
        '--steps 30',
        '--cfg 6.5',
        '--sampler DPM++ 2M Karras',
        seed ? `--seed ${seed}` : '',
      )
      break
    case 'dalle':
      params.push(`--size ${px.size}`, '--quality high')
      break
    case 'runway':
    case 'kling':
    case 'sora':
      params.push(`--ar ${ratio}`, `--duration ${input.duration}s`)
      if (seed) params.push(`--seed ${seed}`)
      break
    default:
      params.push(`--ar ${ratio}`)
  }

  const paramLine = params.filter(Boolean).join(' ')
  return `${parts.filter(Boolean).join(', ')} ${paramLine}`.trim()
}

export function buildToolPromptTh(input: PromptInput): string {
  const medium = findOption(MEDIUMS, input.medium)
  const style = findOption(STYLES, input.style)
  const composition = findOption(COMPOSITIONS, input.composition)
  const lighting = findOption(LIGHTINGS, input.lighting)
  const palette = findOption(PALETTES, input.palette)
  const lens = findOption(LENSES, input.lens)
  const mood = findOption(MOODS, input.mood)
  const camera = findOption(CAMERAS, input.camera)
  const ratio = input.aspect

  const parts = [
    clean(input.brief),
    input.brand ? `โลกของแบรนด์ ${clean(input.brand)}` : '',
    `งาน${medium.th}`,
    `สไตล์${style.th}`,
    `องค์ประกอบแบบ${composition.th}`,
    `แสง${lighting.th}`,
    input.palette === 'custom' && clean(input.customPalette)
      ? `พาเลตต์ ${clean(input.customPalette)}`
      : `พาเลตต์${palette.th}`,
    lens.id !== 'none' ? `เลนส์ ${lens.th}` : '',
    `อารมณ์${mood.th}`,
    input.task === 'video' ? `กล้อง${camera.th} ความยาว ${input.duration} วินาที` : '',
    input.message ? `สารหลัก: ${clean(input.message)}` : '',
    `อัตราส่วน ${ratio}`,
  ]
  return parts.filter(Boolean).join(' · ')
}

export function buildVariations(input: PromptInput): Variation[] {
  const count = Math.min(Math.max(input.variations, 2), 4)
  const definitions: Array<{
    id: string
    name: string
    nameEn: string
    angle: string
    when: string
    overrides: Overrides
  }> = [
    {
      id: 'a',
      name: 'เส้นทาง A — นิ่งและจริง',
      nameEn: 'Quiet Craft',
      angle: 'คุมโทนเดิม แต่ลดทอนรายละเอียดลง ให้วัสดุและแสงพูดแทน',
      when: 'ใช้เมื่อแบรนด์ต้องการความน่าเชื่อถือ และภาพต้องอยู่ได้นานกว่าเทรนด์',
      overrides: { lighting: 'soft-window', mood: 'calm', composition: 'close' },
    },
    {
      id: 'b',
      name: 'เส้นทาง B — แรงตึงอีดิทอเรียล',
      nameEn: 'Editorial Tension',
      angle: 'เพิ่มคอนทราสต์ของแสงและจัดเฟรมให้มีแรงตึง แต่ยังคงความเรียบหรู',
      when: 'ใช้เมื่อต้องการภาพที่หยุดนิ้วในฟีด และยังรู้สึกพรีเมียม',
      overrides: { style: 'editorial', lighting: 'chiaroscuro', mood: 'premium', composition: 'thirds' },
    },
    {
      id: 'c',
      name: 'เส้นทาง C — กราฟิกและกล้า',
      nameEn: 'Graphic Pop',
      angle: 'ลดความสมจริง เพิ่มสีและรูปทรง ให้ภาพจำได้ทันทีในสื่อที่แข่งกันเยอะ',
      when: 'ใช้เมื่อแคมเปญต้องสร้างการรับรู้เร็ว และยอมแลกความสมจริงกับความจำได้',
      overrides: { style: 'experimental', lighting: 'hard-noon', mood: 'bold', composition: 'centered', palette: 'contrast' },
    },
    {
      id: 'd',
      name: 'เส้นทาง D — โลกจริง',
      nameEn: 'Lived-in World',
      angle: 'ย้ายสินค้าเข้าไปอยู่ในชีวิตจริง ลดการจัดฉาก ให้ความรู้สึกเป็นธรรมชาติ',
      when: 'ใช้เมื่อกลุ่มเป้าหมายเบื่อภาพสตูดิโอ และแบรนด์ต้องการความใกล้ชิด',
      overrides: { style: 'photoreal', lighting: 'practical', mood: 'warm', composition: 'wide', lens: '35mm' },
    },
  ]

  return definitions.slice(0, count).map((definition) => ({
    id: definition.id,
    name: definition.name,
    nameEn: definition.nameEn,
    angle: definition.angle,
    when: definition.when,
    prompt: buildToolPrompt(input, definition.overrides),
  }))
}

const SERIES_BEATS: Array<Omit<SeriesRow, 'no' | 'lens'>> = [
  {
    beat: 'Establishing',
    scene: 'ภาพรวมสถานที่และบรรยากาศแรกของเรื่อง',
    action: 'เปิดโลกให้เห็นว่ากำลังอยู่ที่ไหน ใครอยู่ในนั้น',
    framing: 'Wide establishing shot',
  },
  {
    beat: 'Detail',
    scene: 'รายละเอียดพื้นผิว วัสดุ หรือมือที่กำลังทำงาน',
    action: 'โคลสอัปที่ทำให้เชื่อในคุณภาพของสิ่งที่แบรนด์ทำ',
    framing: 'Macro detail',
  },
  {
    beat: 'Hero',
    scene: 'ภาพหลักของผลิตภัณฑ์หรือตัวแบบที่ต้องการให้จำ',
    action: 'จัดวางสินค้า/ตัวแบบให้เป็นศูนย์กลางอย่างมั่นใจ',
    framing: 'Hero medium shot',
  },
  {
    beat: 'Human moment',
    scene: 'ช่วงเวลาการใช้งานจริงของผู้คน',
    action: 'แสดงปฏิสัมพันธ์ที่ทำให้สินค้ามีความหมาย',
    framing: 'Over-the-shoulder candid',
  },
  {
    beat: 'Environment',
    scene: 'บริบทแวดล้อมที่ขยายโลกของแบรนด์',
    action: 'เชื่อมสถานที่กับกลุ่มเป้าหมายและไลฟ์สไตล์',
    framing: 'Wide environmental shot',
  },
  {
    beat: 'Closing',
    scene: 'ภาพปิดที่เว้นพื้นที่สำหรับข้อความหรือโลโก้',
    action: 'จบเรื่องด้วยภาพที่หายใจได้และพร้อมใช้งาน',
    framing: 'Negative-space composition',
  },
  {
    beat: 'Ritual',
    scene: 'ขั้นตอนเล็ก ๆ ในกิจวัตรที่แบรนด์เข้าไปอยู่',
    action: 'ทำให้เห็นว่าสินค้าอยู่ในชีวิตประจำวันอย่างไร',
    framing: 'Medium close-up',
  },
  {
    beat: 'Aftermath',
    scene: 'ร่องรอยหลังการใช้งาน เศษเสี้ยวที่ทำให้เชื่อ',
    action: 'ปิดท้ายด้วยรายละเอียดที่ชวนให้จินตนาการต่อ',
    framing: 'Still-life detail',
  },
]

const SERIES_LENSES = ['24mm', '100mm', '50mm', '35mm', '35mm', '50mm', '85mm', '100mm']

export function buildSeries(input: PromptInput): SeriesRow[] {
  const count = Math.min(Math.max(input.seriesCount, 3), 8)
  return SERIES_BEATS.slice(0, count).map((beat, index) => ({
    no: index + 1,
    ...beat,
    lens: SERIES_LENSES[index] ?? '50mm',
  }))
}

const SHOT_BEATS = [
  ['01', 'Open', 'ภาพเปิดที่บอกสถานที่และเวลา', 'Wide establishing shot', 'slow push-in'],
  ['02', 'Texture', 'รายละเอียดวัสดุที่ทำให้เชื่อในคุณภาพ', 'Macro detail', 'static'],
  ['03', 'Hero', 'ภาพหลักของผลิตภัณฑ์หรือตัวแบบ', 'Hero medium shot', 'slow orbit'],
  ['04', 'Human', 'ปฏิสัมพันธ์ของผู้คนกับสินค้า', 'Over-the-shoulder', 'handheld follow'],
  ['05', 'Mood', 'ช่วงเวลาที่บรรยากาศทำงานแทนคำพูด', 'Wide environmental', 'tracking'],
  ['06', 'Close', 'ภาพปิดที่เว้นที่ให้ข้อความ', 'Negative-space shot', 'static'],
  ['07', 'Transition', 'ช็อตเชื่อมที่พาไปสู่ฉากถัดไป', 'Detail insert', 'whip pan'],
  ['08', 'Outro', 'ภาพจบที่ทิ้งความรู้สึกไว้', 'Wide shot', 'slow pull-out'],
]

export function buildShots(input: PromptInput): ShotRow[] {
  const count = Math.min(Math.max(input.seriesCount, 3), 8)
  const duration = Math.max(input.duration, 5)
  const slice = Math.max(Math.round((duration / count) * 10) / 10, 1)
  return SHOT_BEATS.slice(0, count).map((shot, index) => {
    const start = Math.round(index * slice * 10) / 10
    const end = Math.min(Math.round((index + 1) * slice * 10) / 10, duration)
    return {
      no: index + 1,
      time: `${start}s–${end}s`,
      shot: `${shot[1]} — ${shot[2]}`,
      action: shot[2],
      camera: shot[4],
      lens: SERIES_LENSES[index] ?? '50mm',
    }
  })
}

export function buildChecks(input: PromptInput): string[] {
  const checks = [
    `อัตราส่วน ${input.aspect} ตรงกับที่วางแผนไว้ และปลอดภัยเมื่อครอปเป็น 1:1`,
    'ตัวแบบหลักไม่ถูกตัดที่ข้อต่อหรือขอบภาพอย่างไม่ตั้งใจ',
    'ทิศทางแสงสอดคล้องกันทั้งภาพ ไม่มีเงาที่ขัดกับแหล่งกำเนิดแสง',
  ]
  if (input.composition === 'negative-space' || input.task === 'design') {
    checks.push('มีพื้นที่ว่างเพียงพอสำหรับพาดหัว/โลโก้ และอ่านได้บนพื้นหลังจริง')
  }
  if (input.tool === 'ideogram' || input.task === 'design') {
    checks.push('ข้อความในภาพสะกดถูกทุกตัว และไม่ถูกตัดขอบ')
  }
  if (input.task === 'series') {
    checks.push('ตัวละคร/สินค้าและพาเลตต์เหมือนกันทุกภาพตาม Fixed Block')
    checks.push('แต่ละภาพต่างกันที่ฉากหรือแอ็กชัน ไม่ใช่เปลี่ยนสไตล์')
  }
  if (input.task === 'video') {
    checks.push('ไม่มีหน้าเบี้ยว มือผิดรูป หรือแสงกะพริบระหว่างช็อต')
    checks.push('การเคลื่อนกล้องต่อเนื่องและมีความหมาย ไม่ใช่การขยับเพื่อขยับ')
  }
  checks.push(`พาเลตต์ใกล้เคียง ${paletteClause(input)}`)
  checks.push('ไม่มีลายน้ำ โลโก้ หรือตัวอักษรแปลกปลอมที่ไม่ได้ตั้งใจ')
  if (clean(input.references)) {
    checks.push('ใช้ reference เป็นแนวทาง ไม่ลอกองค์ประกอบหรือตัวตนของศิลปิน')
  }
  checks.push('ผ่านเกณฑ์การคัดเลือก 3 ข้อที่ทีมตกลงไว้ก่อนเริ่มผลิต')
  return checks
}

export function buildToolNotes(input: PromptInput): string[] {
  const tool = findTool(input.tool)
  const notes = [tool.note]
  if (input.tool === 'midjourney') {
    notes.push(`ค่า stylize ${input.stylize}: ยิ่งสูงยิ่งตีความเยอะ ถ้าต้องการตรงบรีฟให้ลดลง 50–100`)
  }
  if (input.tool === 'stable-diffusion') {
    notes.push('ล็อก seed เมื่อเปรียบเทียบสองพรอมป์ เพื่อให้เห็นว่าอะไรคือตัวแปรที่เปลี่ยนผล')
  }
  if (input.tool === 'ideogram') {
    notes.push('ถ้าตัวอักษรเพี้ยน ให้ลดจำนวนคำในภาพและเพิ่มขนาดตัวอักษรในคำสั่ง')
  }
  if (input.task === 'video') {
    notes.push('แยกพรอมป์รายช็อตเสมอ อย่าใส่หลายเหตุการณ์ในคลิปเดียว และระบุ continuity ให้ชัด')
  }
  if (input.task === 'series') {
    notes.push('สร้างภาพแรกให้ผ่านก่อน แล้วใช้ภาพนั้นเป็น reference/seed สำหรับภาพที่เหลือ')
  }
  return notes
}

export function buildTips(input: PromptInput): string[] {
  const tips = [
    'เปลี่ยนทีละตัวแปร และบันทึกเวอร์ชันไว้เสมอ เพื่อให้รู้ว่าอะไรทำให้ภาพดีขึ้น',
    'บอกคุณสมบัติของภาพ (เส้นหนา สีดิน กระดาษ) แทนการอ้างชื่อศิลปิน เพื่อให้ผลลัพธ์ทำซ้ำได้',
    'แยก "สิ่งที่ต้องคงที่" ออกจาก "สิ่งที่เปลี่ยน" ก่อนเริ่มทำซีรีส์หรือแคมเปญ',
  ]
  if (input.task === 'video') {
    tips.push('เริ่มจากช็อตที่นิ่งที่สุดก่อน เมื่อคุมภาพได้แล้วจึงเพิ่มการเคลื่อนกล้อง')
  }
  if (input.task === 'debug') {
    tips.push('ตัดคำคุณศัพท์ที่วัดไม่ได้ออกทีละคำ แล้วทดสอบซ้ำด้วย seed เดิม')
  }
  return tips
}

function table(rows: SeriesRow[]): string {
  const header = '| ลำดับ | Beat | ฉาก | แอ็กชัน | เฟรม | เลนส์ |'
  const divider = '| --- | --- | --- | --- | --- | --- |'
  const body = rows
    .map((row) => `| ${row.no} | ${row.beat} | ${row.scene} | ${row.action} | ${row.framing} | ${row.lens} |`)
    .join('\n')
  return [header, divider, body].join('\n')
}

function shotTable(rows: ShotRow[]): string {
  const header = '| ช็อต | เวลา | ภาพ | การเคลื่อนกล้อง | เลนส์ |'
  const divider = '| --- | --- | --- | --- | --- |'
  const body = rows
    .map((row) => `| ${row.no} | ${row.time} | ${row.action} | ${row.camera} | ${row.lens} |`)
    .join('\n')
  return [header, divider, body].join('\n')
}

function deliverablesThai(input: PromptInput, series: SeriesRow[], shots: ShotRow[]): string[] {
  switch (input.task) {
    case 'series':
      return [
        'ตาราง Fixed Block (องค์ประกอบ | คำอธิบายที่ตรึง) สำหรับตัวละคร สินค้า พาเลตต์ แสง และสไตล์',
        `ตารางซีรีส์ ${input.seriesCount} ภาพ ตามโครงด้านล่าง`,
        'พรอมป์รายชิ้นของทุกภาพ แยกใน code block ของตัวเอง',
        'บันทึกเวอร์ชัน V01–V0N พร้อมระบุว่าอะไรเปลี่ยนในแต่ละรอบ',
        'เกณฑ์คัดเลือก 3 ข้อ และ 5 จุดที่ต้องตรวจความสม่ำเสมอ',
        'ข้อความสรุปสั้น ๆ สำหรับส่งต่อให้ทีมผลิตหรือลูกค้า',
      ]
    case 'video':
      return [
        `Shot list ${shots.length} ช็อต ความยาวรวม ${input.duration} วินาที`,
        'พรอมป์รายช็อต ระบุ action, camera, lens, light และ continuity',
        'โน้ตจังหวะการตัดต่อและเสียง (อธิบายเป็นคำ ไม่ต้องมีไฟล์)',
        'Negative prompt สำหรับวิดีโอ',
        'รายการสิ่งที่ต้องคงที่ตลอดคลิป และจุดที่ต้องตรวจก่อนอนุมัติ',
      ]
    case 'campaign':
      return [
        '3 creative territories ที่ต่างกันจริง พร้อมชื่อ แนวคิด และเหตุผล',
        'Key visual prompt ของแต่ละเส้นทาง',
        'การปรับใช้กับ 4:5, 1:1 และ 9:16',
        'แผนนำไปใช้กับโซเชียล หน้าร้าน และสื่อสิ่งพิมพ์',
        'เกณฑ์เลือกเส้นทางที่ Suitable กับแบรนด์และงบประมาณ',
        'ความเสี่ยงของแต่ละเส้นทางและวิธีลดความเสี่ยง',
      ]
    case 'design':
      return [
        'โครงกริดและลำดับชั้นของข้อมูล (Hierarchy)',
        'ทิศทางตัวอักษร น้ำหนัก และระยะห่าง (ไม่ต้องระบุชื่อฟอนต์ที่ไม่มีสิทธิ์)',
        'พรอมป์ภาพหลักที่เว้นพื้นที่สำหรับข้อความ',
        'แผนผังพื้นที่ปลอดภัยของข้อความและโลโก้',
        'สเปกไฟล์สำหรับพิมพ์และดิจิทัล พร้อมขนาดและ bleed',
        'รายการตรวจสอบก่อนส่งพิมพ์',
      ]
    case 'debug':
      return [
        'ตารางวินิจฉัย: ปัญหา | สาเหตุที่เป็นไปได้ | วิธีแก้',
        'พรอมป์ฉบับแก้ไข 1 ชุด พร้อมเหตุผลว่าทำไมจึงเปลี่ยน',
        'แผน A/B test 3 รอบ โดยเปลี่ยนทีละตัวแปร',
        'พารามิเตอร์ที่แนะนำ และค่าที่ไม่ควรใช้',
        'เงื่อนไขที่ต้องยอมรับว่าพรอมป์อย่างเดียวแก้ไม่ได้ (ต้องใช้ reference หรือ retouch)',
      ]
    case 'adapt':
      return [
        'Master direction ที่อธิบายเจตนาโดยไม่ผูกกับเครื่องมือ',
        'ตารางแปลงพรอมป์สำหรับเครื่องมือที่เลือก และอีก 2 เครื่องมือที่ใกล้เคียง',
        'ความต่างของ syntax และข้อจำกัดของแต่ละเครื่องมือ',
        'องค์ประกอบที่ต้องคงที่ vs สิ่งที่ปรับได้ต่อเครื่องมือ',
        'แผนทดสอบเพื่อเทียบผลลัพธ์อย่างเป็นธรรม',
      ]
    default:
      return [
        'พรอมป์ภาพหลัก 1 ชุด พร้อมพารามิเตอร์ของเครื่องมือ',
        'พรอมป์ทางเลือก 2 ชุด ที่ต่างกันเฉพาะมุมกล้อง แสง หรือพาเลตต์',
        'Negative prompt ที่ใช้ได้จริง',
        'เหตุผลขององค์ประกอบภาพ 3 ข้อ',
        'Checklist ก่อนนำไปใช้ และข้อเสนอการปรับสำหรับ 3 อัตราส่วน',
      ]
  }
}

function deliverablesEnglish(input: PromptInput, series: SeriesRow[], shots: ShotRow[]): string[] {
  switch (input.task) {
    case 'series':
      return [
        'A fixed-block sheet (element | locked description) for character, product, palette, light and style',
        `A series table for ${input.seriesCount} images following the structure below`,
        'One prompt per image, each in its own code block',
        'A version log V01–V0N stating what changed in each round',
        'Three selection criteria and five consistency checks',
        'A short handover paragraph for the production team or client',
      ]
    case 'video':
      return [
        `A shot list of ${shots.length} shots totalling ${input.duration} seconds`,
        'One prompt per shot covering action, camera, lens, light and continuity',
        'Editing and sound direction notes in words',
        'A video-specific negative prompt',
        'A continuity checklist and approval checklist',
      ]
    case 'campaign':
      return [
        'Three genuinely distinct creative territories with names, ideas and rationale',
        'A key visual prompt for each territory',
        'Adaptations for 4:5, 1:1 and 9:16',
        'A rollout plan for social, retail and print',
        'Selection criteria tied to the brand and budget',
        'Risks per territory and mitigation',
      ]
    case 'design':
      return [
        'A layout grid and information hierarchy',
        'Typography direction: weight, scale and spacing (no unlicensed font names)',
        'A key visual prompt with reserved text-safe space',
        'A text and logo safe-area map',
        'Print and digital file specs including dimensions and bleed',
        'A pre-press checklist',
      ]
    case 'debug':
      return [
        'A diagnosis table: problem | likely cause | fix',
        'One revised prompt with a reason for every change',
        'An A/B test plan of three rounds changing one variable at a time',
        'Recommended parameter values and values to avoid',
        'An honest note on what prompting alone cannot fix (reference or retouch needed)',
        'A final prompt in a copy-ready block',
      ]
    case 'adapt':
      return [
        'A master direction written independently of any tool',
        'A conversion table for the selected tool and two comparable tools',
        'Syntax differences and limitations per tool',
        'What stays fixed versus what adapts per tool',
        'A fair test plan for comparing outputs',
      ]
    default:
      return [
        'One primary image prompt with tool parameters',
        'Two alternative prompts varying only camera, light or palette',
        'A usable negative prompt',
        'Three reasons behind the visual choices',
        'A pre-flight checklist and crop notes for three aspect ratios',
      ]
  }
}

export function buildMasterPrompt(input: PromptInput): string {
  const { task, tool, medium, style, composition, lighting, lens, mood, camera, aspect, ratio } = resolve(input)
  const series = buildSeries(input)
  const shots = buildShots(input)
  const isThai = input.language === 'th'
  const palette = paletteClause(input)
  const refs = clean(input.references)
  const avoid = clean(input.avoid)
  const notes = clean(input.extraNotes)
  const variants = buildVariations(input)

  if (isThai) {
    const lines: string[] = [
      'ROLE — บทบาท',
      'คุณคืออาร์ตไดเรกเตอร์และผู้เชี่ยวชาญการเขียนพรอมป์สำหรับเครื่องมือสร้างภาพ วิดีโอ และงานออกแบบ คุณแปลงเจตนาทางสร้างสรรค์ให้เป็นคำอธิบายที่แม่นยำ ทำซ้ำได้ และรู้ข้อจำกัดของแต่ละเครื่องมือโดยไม่แต่งพารามิเตอร์ขึ้นเอง',
      '',
      'GOAL — เป้าหมาย',
      `สร้างชุดพรอมป์${task.th}ที่พร้อมใช้จริง โดยคงเจตนาของบรีฟไว้ และส่งมอบงานตามรายการด้านล่าง`,
      '',
      'CONTEXT — บริบท',
      `- แบรนด์: ${clean(input.brand) || 'ไม่ระบุ (ให้สรุปเป็นกลาง)'}`,
      `- กลุ่มเป้าหมาย: ${clean(input.audience) || 'ไม่ระบุ'}`,
      `- สารหลัก: ${clean(input.message) || 'ไม่ระบุ'}`,
      `- เครื่องมือปลายทาง: ${tool.name}`,
      `- อัตราส่วน: ${aspect.en} (${ratio.px})`,
      '',
      'BRIEF — บรีฟจากลูกค้า',
      '"""',
      clean(input.brief) || '(ยังไม่ได้กรอกบรีฟ)',
      '"""',
      '',
      'VISUAL DIRECTION — แนวทางภาพ',
      `- สื่อ: ${medium.th}`,
      `- สไตล์: ${style.th} — ${style.prompt}`,
      `- องค์ประกอบ: ${composition.th} — ${composition.prompt}`,
      `- แสง: ${lighting.th} — ${lighting.prompt}`,
      `- พาเลตต์: ${palette}`,
      lens.id !== 'none' ? `- เลนส์: ${lens.th}` : '- เลนส์: ไม่ระบุ',
      `- อารมณ์: ${mood.th}`,
      input.task === 'video' ? `- กล้อง: ${camera.th} — ${camera.prompt}` : '',
      notes ? `- โน้ตเพิ่มเติม: ${notes}` : '',
      '',
      'TOOL SYNTAX — ข้อกำหนดของเครื่องมือ',
      `- ใช้ ${tool.name}: ${tool.note}`,
      `- พารามิเตอร์ตั้งต้น: ${parameterLine(input)}`,
      '',
      'DELIVERABLES — สิ่งที่ต้องส่งมอบ',
      ...deliverablesThai(input, series, shots).map((item, index) => `${index + 1}. ${item}`),
      '',
    ]

    if (input.task === 'series') {
      lines.push(
        'SERIES STRUCTURE — โครงซีรีส์ที่ต้องใช้',
        table(series),
        '',
        'กำหนด Fixed Block ก่อนเขียนพรอมป์รายชิ้น: ตัวละคร/สินค้า ต้องเหมือนเดิมทุกภาพ, พาเลตต์ต้องเหมือนเดิม, แสงต้องอยู่ในระบบเดียวกัน และเปลี่ยนได้เฉพาะฉากกับแอ็กชัน',
        '',
        'VARIATION ROUTES — เส้นทางที่ต้องเปรียบเทียบ',
        ...variants.map(
          (variant) => `- ${variant.name} (${variant.nameEn}): ${variant.angle} ใช้เมื่อ ${variant.when}`,
        ),
        '',
      )
    } else if (input.task === 'video') {
      lines.push(
        'SHOT STRUCTURE — โครงช็อตที่ต้องใช้',
        shotTable(shots),
        '',
        'ทุกช็อตต้องระบุ continuity: หน้าตาและเสื้อผ้าของตัวแบบต้องเหมือนเดิม แสงต้องไม่กระโดด และทิศทางการเคลื่อนกล้องต้องต่อกันได้',
        '',
      )
    } else if (input.task === 'debug') {
      lines.push(
        'DIAGNOSIS — สิ่งที่ต้องวินิจฉัย',
        'ตรวจพรอมป์ในบรีฟว่ามีคำที่วัดไม่ได้ (beautiful, amazing, 8k, masterpiece) มากเกินไปหรือไม่ มีคำขัดกันหรือไม่ และมีข้อจำกัดที่ขาดหาย เช่น มุมกล้อง แสง วัสดุ หรือสิ่งที่ต้องไม่ให้เกิดขึ้น',
        '',
      )
    } else if (input.task === 'campaign') {
      lines.push(
        'TERRITORIES — เส้นทางที่ต้องเสนอ',
        ...variants.map(
          (variant) => `- ${variant.name} (${variant.nameEn}): ${variant.angle} ใช้เมื่อ ${variant.when}`,
        ),
        '',
      )
    }

    lines.push(
      'CONSTRAINTS — ข้อกำหนดและข้อห้าม',
      `- หลีกเลี่ยง: ${avoid || 'การอ้างชื่อศิลปินที่มีชีวิต คำที่วัดไม่ได้ และการลอกองค์ประกอบจาก reference โดยตรง'}`,
      input.negatives ? `- Negative: ${clean(input.negatives)}` : '- ใส่ negative prompt ที่เฉพาะเจาะจงกับงาน ไม่ใช้ลิสต์สำเร็จรูปยาว ๆ',
      refs ? `- Reference: ${refs} — ใช้เป็นแนวทาง ไม่ลอกผลงานหรือตัวตนของศิลปิน` : '- ไม่มี reference แนบมา',
      '- หลีกเลี่ยงตัวอักษรในภาพ เว้นแต่เป็นงานออกแบบที่ต้องมีข้อความ',
      '- รักษาความสม่ำเสมอของแบรนด์และความถูกต้องของภาษาไทย',
      '',
      'QUALITY CHECKS — เกณฑ์ตรวจงาน',
      ...buildChecks(input).map((item) => `- ${item}`),
      '',
      'OUTPUT FORMAT — รูปแบบผลลัพธ์',
      '- ตอบเป็นภาษาไทย กระชับ ไม่เกริ่นนำ',
      '- ใช้หัวข้อตาม Deliverables',
      '- ทุกพรอมป์ที่ต้องนำไปใช้ ให้อยู่ใน code block แยก เพื่อคัดลอกได้ทันที',
      '- ระบุพารามิเตอร์ของเครื่องมือให้ครบ และอย่าสร้างพารามิเตอร์ที่ไม่มีอยู่จริง',
      '- ถ้าข้อมูลไม่พอ ให้ถามกลับไม่เกิน 3 คำถามก่อนเขียน',
      '',
      input.task === 'adapt'
        ? 'หมายเหตุ: ให้ตารางแปลงพรอมป์ระหว่างเครื่องมือ พร้อมระบุว่าองค์ประกอบใดต้องคงที่ และองค์ประกอบใดปรับตามข้อจำกัดของแต่ละเครื่องมือ'
        : 'หมายเหตุ: ถ้าเลือกใช้เส้นทางใด ให้บอกเหตุผลสั้น ๆ 2 ข้อ และระบุความเสี่ยงที่ต้องจัดการ',
    )

    return lines.join('\n')
  }

  const lines: string[] = [
    'ROLE',
    'You are an art director and prompt specialist for generative image, video and design tools. You translate creative intent into precise, repeatable descriptions and you respect each tool’s real syntax without inventing parameters.',
    '',
    'GOAL',
    `Create a production-ready ${task.en.toLowerCase()} prompt system that preserves the intent of the brief and delivers every item listed below.`,
    '',
    'CONTEXT',
    `- Brand: ${clean(input.brand) || 'not specified (keep it neutral)'}`,
    `- Audience: ${clean(input.audience) || 'not specified'}`,
    `- Key message: ${clean(input.message) || 'not specified'}`,
    `- Target tool: ${tool.name}`,
    `- Aspect ratio: ${aspect.en} (${ratio.px})`,
    '',
    'BRIEF',
    '"""',
    clean(input.brief) || '(no brief provided)',
    '"""',
    '',
    'VISUAL DIRECTION',
    `- Medium: ${medium.en}`,
    `- Style: ${style.en} — ${style.prompt}`,
    `- Composition: ${composition.en} — ${composition.prompt}`,
    `- Light: ${lighting.en} — ${lighting.prompt}`,
    `- Palette: ${palette}`,
    lens.id !== 'none' ? `- Lens: ${lens.en} — ${lens.prompt}` : '- Lens: unspecified',
    `- Mood: ${mood.en} — ${mood.prompt}`,
    input.task === 'video' ? `- Camera: ${camera.en} — ${camera.prompt}` : '',
    notes ? `- Extra notes: ${notes}` : '',
    '',
    'TOOL SYNTAX',
    `- Use ${tool.name}: ${tool.note}`,
    `- Starting parameters: ${parameterLine(input)}`,
    '',
    'DELIVERABLES',
    ...deliverablesEnglish(input, series, shots).map((item, index) => `${index + 1}. ${item}`),
    '',
  ]

  if (input.task === 'series') {
    lines.push(
      'SERIES STRUCTURE',
      table(series),
      '',
      'Lock the fixed block before writing individual prompts: the character or product, palette and lighting system stay identical. Only scene and action change.',
      '',
      'VARIATION ROUTES',
      ...variants.map((variant) => `- ${variant.nameEn}: ${variant.angle} Use when: ${variant.when}`),
      '',
    )
  } else if (input.task === 'video') {
    lines.push(
      'SHOT STRUCTURE',
      shotTable(shots),
      '',
      'Every shot must state continuity: face, wardrobe and props stay consistent, lighting must not jump, and camera direction must cut together.',
      '',
    )
  } else if (input.task === 'debug') {
    lines.push(
      'DIAGNOSIS',
      'Inspect the prompt in the brief. Identify unmeasurable adjectives, contradictory instructions and missing anchors (angle, light, material, exclusions). Explain each issue before rewriting.',
      '',
    )
  } else if (input.task === 'campaign') {
    lines.push(
      'TERRITORIES',
      ...variants.map((variant) => `- ${variant.nameEn}: ${variant.angle} Use when: ${variant.when}`),
      '',
    )
  }

  lines.push(
    'CONSTRAINTS',
    `- Avoid: ${avoid || 'living artist names, unmeasurable adjectives, and copying reference compositions directly'}`,
    input.negatives ? `- Negative prompt: ${clean(input.negatives)}` : '- Write a specific negative prompt, not a long generic list.',
    refs ? `- References: ${refs} — use as direction only; do not copy the work or identity of an artist.` : '- No references supplied.',
    '- No text inside images unless the deliverable is a design that needs it.',
    '- Preserve brand consistency and correct spelling.',
    '',
    'QUALITY CHECKS',
    ...buildChecks(input).map((item) => `- ${item}`),
    '',
    'OUTPUT FORMAT',
    '- Be concise. No preamble.',
    '- Use the Deliverables headings.',
    '- Put every copy-ready prompt in its own code block.',
    '- Include real tool parameters only.',
    '- If information is missing, ask at most three questions before writing.',
    '',
    input.task === 'adapt'
      ? 'Note: include a prompt conversion table across tools, stating what stays fixed and what adapts to each tool’s constraints.'
      : 'Note: if you recommend one route, give two short reasons and one risk to manage.',
  )

  return lines.join('\n')
}

export function parameterLine(input: PromptInput): string {
  const ratio = input.aspect || '4:5'
  const px = RATIO_PIXELS[ratio] ?? RATIO_PIXELS['4:5']
  const seed = clean(input.seed)
  switch (input.tool) {
    case 'midjourney':
      return `--ar ${ratio} --v 6.1 --style raw --stylize ${input.stylize}${seed ? ` --seed ${seed}` : ''}`
    case 'flux':
      return `--ar ${ratio} --guidance 3.5 --steps 28${seed ? ` --seed ${seed}` : ''}`
    case 'firefly':
      return `--ar ${ratio} --content-type photo --visual-intensity 7`
    case 'ideogram':
      return `--ar ${ratio} --style realistic --magic-prompt off`
    case 'stable-diffusion':
      return `--ar ${ratio} --steps 30 --cfg 6.5 --sampler DPM++ 2M Karras${seed ? ` --seed ${seed}` : ''}`
    case 'dalle':
      return `--size ${px.size} --quality high`
    case 'runway':
    case 'kling':
    case 'sora':
      return `--ar ${ratio} --duration ${input.duration}s${seed ? ` --seed ${seed}` : ''}`
    default:
      return `--ar ${ratio}`
  }
}

export function generatePrompt(input: PromptInput): GenerateResult {
  const { task, tool, style, medium, aspect, palette } = resolve(input)
  const keywords = uniq([
    ...(style.tags ?? []),
    ...(medium.tags ?? []),
    ...(findOption(PALETTES, input.palette).tags ?? []),
    ...(findOption(MOODS, input.mood).tags ?? []),
    task.short,
    tool.name.toLowerCase().replace(/\s+/g, '-'),
  ]).slice(0, 10)

  return {
    title: buildTitle(input),
    summary: buildSummary(input),
    task: task.id as GenerateResult['task'],
    tool: tool.id,
    style: style.id,
    toolName: tool.name,
    masterPrompt: buildMasterPrompt(input),
    toolPrompt: buildToolPrompt(input),
    toolPromptTh: buildToolPromptTh(input),
    negativePrompt: buildNegative(input),
    parameterLine: parameterLine(input),
    variations: buildVariations(input),
    series: task.id === 'series' ? buildSeries(input) : [],
    shots: task.id === 'video' ? buildShots(input) : [],
    checks: buildChecks(input),
    toolNotes: buildToolNotes(input),
    tips: buildTips(input),
    keywords,
    input,
    createdAt: new Date().toISOString(),
  }
}

export const TASK_IDS = TASKS.map((task) => task.id)
export const TOOL_IDS = TOOLS.map((tool) => tool.id)
export const ASPECT_IDS = ASPECTS.map((aspect) => aspect.id)
export const STYLE_IDS = STYLES.map((style) => style.id)
