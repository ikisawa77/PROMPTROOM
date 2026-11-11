import type { PromptInput, TaskId, ToolId } from './types'

export interface Option {
  id: string
  th: string
  en: string
  desc?: string
  prompt?: string
  tags?: string[]
  swatch?: string[]
}

export interface TaskOption extends Option {
  short: string
  output: string
}

export interface ToolOption {
  id: ToolId
  name: string
  best: string
  note: string
  supportsNegative: boolean
  group: 'image' | 'video'
}

export const TASKS: TaskOption[] = [
  {
    id: 'image',
    th: 'ภาพเดี่ยว',
    en: 'Single image',
    short: 'ภาพ',
    output: 'พรอมป์ 1 ภาพ + ทางเลือก 2 routes',
    desc: 'ภาพนิ่งหนึ่งภาพที่จบในตัว พร้อมพรอมป์สำรอง',
  },
  {
    id: 'series',
    th: 'ซีรีส์ภาพ',
    en: 'Image series',
    short: 'ซีรีส์',
    output: 'Fixed block + ตารางซีรีส์ + พรอมป์รายชิ้น',
    desc: 'ชุดภาพที่คุมโทนเดียวกันได้ตลอดแคมเปญ',
  },
  {
    id: 'video',
    th: 'วิดีโอ',
    en: 'Video',
    short: 'วิดีโอ',
    output: 'Shot list + พรอมป์รายช็อต + โน้ตกล้อง',
    desc: 'ช็อตต่อช็อต พร้อมการเคลื่อนกล้องและจังหวะ',
  },
  {
    id: 'campaign',
    th: 'แคมเปญ',
    en: 'Campaign',
    short: 'แคมเปญ',
    output: '3 creative territories + key visual',
    desc: 'สามเส้นทางสร้างสรรค์ให้ลูกค้าเลือกก่อนผลิตจริง',
  },
  {
    id: 'design',
    th: 'งานออกแบบ',
    en: 'Graphic design',
    short: 'ดีไซน์',
    output: 'โครงเลย์เอาต์ + ทิศทางภาพ + พื้นที่ข้อความ',
    desc: 'โปสเตอร์ คีย์วิชวล และงานสิ่งพิมพ์ที่ต้องมีข้อความ',
  },
  {
    id: 'debug',
    th: 'แก้พรอมป์',
    en: 'Debug prompt',
    short: 'แก้พรอมป์',
    output: 'วินิจฉัย + พรอมป์ฉบับแก้ + แผนทดสอบ',
    desc: 'หาสาเหตุที่ภาพออกมาไม่ตรง แล้วแก้อย่างเป็นระบบ',
  },
  {
    id: 'adapt',
    th: 'แปลงข้ามเครื่องมือ',
    en: 'Adapt across tools',
    short: 'แปลง',
    output: 'ตารางแปลง + ความต่างของ syntax',
    desc: 'ย้ายพรอมป์เดียวให้ใช้ได้กับหลายเครื่องมือ',
  },
]

export const TOOLS: ToolOption[] = [
  {
    id: 'midjourney',
    name: 'Midjourney',
    best: 'ภาพนิ่งคุณภาพสูง',
    note: 'ใช้ --ar กำหนดอัตราส่วน, --stylize 0–1000 และ --style raw เพื่อลดการตีความเกิน',
    supportsNegative: true,
    group: 'image',
  },
  {
    id: 'flux',
    name: 'Flux',
    best: 'ภาพสมจริงและตัวอักษร',
    note: 'Flux ชอบประโยคธรรมชาติที่ต่อเนื่อง หลีกเลี่ยงพารามิเตอร์แบบ Midjourney และใช้ guidance 3–4',
    supportsNegative: false,
    group: 'image',
  },
  {
    id: 'firefly',
    name: 'Adobe Firefly',
    best: 'งานแบรนด์ที่ต้องปลอดลิขสิทธิ์',
    note: 'ระบุ Content type และ Visual intensity ให้ชัด เลือกสัดส่วนก่อนสร้าง และตรวจว่าใช้โมเดลที่รองรับงานเชิงพาณิชย์',
    supportsNegative: false,
    group: 'image',
  },
  {
    id: 'ideogram',
    name: 'Ideogram',
    best: 'ภาพที่มีตัวอักษร',
    note: 'ใส่ข้อความที่ต้องการในเครื่องหมายคำถามคู่ ระบุตำแหน่งและน้ำหนักตัวอักษร และตรวจการสะกดทุกครั้ง',
    supportsNegative: true,
    group: 'image',
  },
  {
    id: 'stable-diffusion',
    name: 'Stable Diffusion',
    best: 'ควบคุมละเอียด / ทำงานในทีม',
    note: 'แยก positive และ negative ให้ชัด ตั้ง CFG 6–8 เลือก sampler ที่ทีมใช้ประจำ และล็อก seed เมื่อเทียบผล',
    supportsNegative: true,
    group: 'image',
  },
  {
    id: 'dalle',
    name: 'DALL·E (ChatGPT)',
    best: 'ภาพประกอบเร็ว ๆ',
    note: 'DALL·E ไม่รับพารามิเตอร์เชิงเทคนิค ให้เขียนเป็นคำอธิบายยาวที่เป็นธรรมชาติ และขอให้แก้ทีละจุด',
    supportsNegative: false,
    group: 'image',
  },
  {
    id: 'runway',
    name: 'Runway',
    best: 'คลิปสั้นและ motion',
    note: 'ระบุ duration, การเคลื่อนกล้อง และสิ่งที่ต้องคงที่แบบช็อตต่อช็อต หลีกเลี่ยงการบรรยายหลายเหตุการณ์ในคลิปเดียว',
    supportsNegative: false,
    group: 'video',
  },
  {
    id: 'kling',
    name: 'Kling',
    best: 'วิดีโอสมจริง',
    note: 'แยก subject / action / camera / lighting ในบรรทัดเดียวให้ชัด ระบุ negative prompt และความยาวคลิป',
    supportsNegative: true,
    group: 'video',
  },
  {
    id: 'sora',
    name: 'Sora',
    best: 'ฉาก cinematic ยาวขึ้น',
    note: 'บรรยายเป็น timeline: shot → action → camera → light → continuity ระบุสิ่งที่ต้องเหมือนเดิมตลอดคลิป',
    supportsNegative: false,
    group: 'video',
  },
  {
    id: 'generic',
    name: 'เครื่องมืออื่น / LLM',
    best: 'ใช้ได้ทุกเครื่องมือ',
    note: 'โครงสร้างนี้ใช้เป็น master prompt ให้ LLM ช่วยเขียนพรอมป์เฉพาะเครื่องมือได้ทันที',
    supportsNegative: true,
    group: 'image',
  },
]

export const STYLES: Option[] = [
  {
    id: 'editorial',
    th: 'อีดิทอเรียล',
    en: 'Editorial',
    desc: 'เรียบหรู มีความตั้งใจในการจัดวาง',
    prompt:
      'editorial art direction, considered styling, magazine-grade composition, matte film grain, quiet luxury',
    tags: ['editorial', 'magazine', 'refined'],
    swatch: ['#e8ded2', '#8c3b2e', '#2f2a26'],
  },
  {
    id: 'minimal',
    th: 'มินิมอล',
    en: 'Minimal',
    desc: 'พื้นที่ว่างคือพระเอก',
    prompt:
      'minimalist composition, restrained detail, generous negative space, precise alignment, quiet confidence',
    tags: ['minimal', 'clean', 'space'],
    swatch: ['#f2efe7', '#111111', '#b8b2a6'],
  },
  {
    id: 'cinematic',
    th: 'ซินีมาติก',
    en: 'Cinematic',
    desc: 'แสง เงา และบรรยากาศแบบภาพยนตร์',
    prompt:
      'cinematic still, anamorphic framing, dramatic depth, filmic color grade, subtle atmospheric haze',
    tags: ['cinematic', 'depth', 'film'],
    swatch: ['#0e1620', '#264653', '#e9c46a'],
  },
  {
    id: 'photoreal',
    th: 'สมจริง',
    en: 'Photoreal',
    desc: 'ผิวจริง วัสดุจริง ไม่แต่งเกิน',
    prompt:
      'photorealistic, natural material detail, true-to-life skin and texture, documentary honesty',
    tags: ['photoreal', 'texture', 'natural'],
    swatch: ['#d9cfc1', '#7a6a58', '#2b2621'],
  },
  {
    id: 'illustrated',
    th: 'อิลลัสเทรชัน',
    en: 'Illustrated',
    desc: 'เส้นและสีที่มีคาแรกเตอร์',
    prompt:
      'contemporary editorial illustration, confident linework, flat color blocking, visible paper texture',
    tags: ['illustration', 'linework', 'flat'],
    swatch: ['#f4e9d8', '#d95d39', '#1b3a4b'],
  },
  {
    id: '3d',
    th: 'สามมิติ',
    en: '3D render',
    desc: 'วัสดุ tactile แบบสตูดิโอ',
    prompt:
      'soft 3D render, tactile materials, studio product lighting, subtle subsurface scattering, premium finish',
    tags: ['3d', 'render', 'material'],
    swatch: ['#ddd7ff', '#7c6cff', '#1a1625'],
  },
  {
    id: 'luxury',
    th: 'ลักชัวรี',
    en: 'Luxury',
    desc: 'วัสดุหรู เงาลึก รายละเอียดน้อยแต่แพง',
    prompt:
      'quiet luxury art direction, refined materials, deep shadow, restrained metallic accents, bespoke detail',
    tags: ['luxury', 'premium', 'craft'],
    swatch: ['#1c1a17', '#c8a96a', '#efe9dd'],
  },
  {
    id: 'experimental',
    th: 'ทดลอง',
    en: 'Experimental',
    desc: 'กล้าแตกกรอบ แต่ยังคุมได้',
    prompt:
      'experimental mixed-media direction, intentional imperfection, collage texture, rule-breaking framing',
    tags: ['experimental', 'collage', 'bold'],
    swatch: ['#ff4a1c', '#d8ff4f', '#111111'],
  },
  {
    id: 'retro',
    th: 'เรโทร',
    en: 'Retro',
    desc: 'เกรนฟิล์มและพาเลตต์ยุคเก่า',
    prompt:
      'retro-inspired direction, 1970s print palette, analog grain, soft focus, vintage type energy',
    tags: ['retro', 'analog', 'warm'],
    swatch: ['#e9c46a', '#e76f51', '#2a9d8f'],
  },
  {
    id: 'brutalist',
    th: 'บรูทัลลิสต์',
    en: 'Brutalist',
    desc: 'ตัวหนัก คอนทราสต์จัด กริดดิบ',
    prompt:
      'brutalist graphic direction, heavy typography, raw contrast, utilitarian grid, unpolished paper stock',
    tags: ['brutalist', 'type', 'raw'],
    swatch: ['#f2f2f2', '#0a0a0a', '#ff3b00'],
  },
  {
    id: 'organic',
    th: 'ออร์แกนิก',
    en: 'Organic',
    desc: 'ธรรมชาติ งานมือ วัสดุจากโลกจริง',
    prompt:
      'organic modern direction, natural fibers, botanical forms, sun-washed tones, handcrafted feel',
    tags: ['organic', 'natural', 'craft'],
    swatch: ['#e5e0d0', '#6b7a54', '#c08457'],
  },
  {
    id: 'tech',
    th: 'เทค',
    en: 'Tech',
    desc: 'เรขาคณิต แสงเย็น และความแม่นยำ',
    prompt:
      'futuristic tech direction, precision geometry, cool light, glass and metal, systematic composition',
    tags: ['tech', 'future', 'precision'],
    swatch: ['#0b1220', '#3b82f6', '#c7f9ff'],
  },
]

export const MEDIUMS: Option[] = [
  {
    id: 'still',
    th: 'ภาพนิ่ง',
    en: 'Still image',
    prompt: 'single still image',
    tags: ['still', 'image'],
    desc: 'ภาพนิ่งทั่วไปที่จบในเฟรม',
  },
  {
    id: 'product',
    th: 'ภาพสินค้า',
    en: 'Product photo',
    prompt: 'premium product photography, controlled reflections, crisp material detail',
    tags: ['product', 'packshot'],
    desc: 'ภาพสินค้าที่ต้องดูแพงและขายได้',
  },
  {
    id: 'portrait',
    th: 'พอร์เทรต',
    en: 'Portrait',
    prompt: 'editorial portrait photography, natural skin texture, intentional gaze',
    tags: ['portrait', 'human'],
    desc: 'คนเป็นศูนย์กลาง อารมณ์ชัด',
  },
  {
    id: 'lifestyle',
    th: 'ไลฟ์สไตล์',
    en: 'Lifestyle',
    prompt: 'lifestyle photography with a human element, lived-in setting, candid energy',
    tags: ['lifestyle', 'candid'],
    desc: 'สินค้าอยู่ในชีวิตจริง',
  },
  {
    id: 'illustration',
    th: 'ภาพประกอบ',
    en: 'Illustration',
    prompt: 'editorial illustration',
    tags: ['illustration', 'art'],
    desc: 'ภาพวาดหรือกราฟิกที่มีสไตล์',
  },
  {
    id: 'render3d',
    th: 'เรนเดอร์ 3D',
    en: '3D render',
    prompt: 'high-end 3D product render',
    tags: ['3d', 'render'],
    desc: 'โมเดลและแสงที่ควบคุมได้ 100%',
  },
  {
    id: 'graphic',
    th: 'กราฟิก / คีย์วิชวล',
    en: 'Key visual',
    prompt: 'graphic key visual with a clear visual hierarchy',
    tags: ['graphic', 'keyvisual'],
    desc: 'ภาพหลักของแคมเปญ',
  },
  {
    id: 'poster',
    th: 'โปสเตอร์',
    en: 'Poster',
    prompt: 'poster design, strong typographic hierarchy, print-ready composition',
    tags: ['poster', 'print'],
    desc: 'งานพิมพ์ที่ต้องอ่านจากระยะไกล',
  },
  {
    id: 'packaging',
    th: 'แพ็กเกจ',
    en: 'Packaging',
    prompt: 'packaging design mockup, tactile material, shelf presence',
    tags: ['packaging', 'mockup'],
    desc: 'ภาพจำลองบรรจุภัณฑ์',
  },
  {
    id: 'video',
    th: 'วิดีโอสั้น',
    en: 'Short video',
    prompt: 'short-form cinematic video',
    tags: ['video', 'motion'],
    desc: 'คลิปสั้นสำหรับโซเชียลหรือโฆษณา',
  },
  {
    id: 'set',
    th: 'เซ็ตดีไซน์',
    en: 'Set design',
    prompt: 'set design and spatial styling, deliberate props, controlled environment',
    tags: ['setdesign', 'space'],
    desc: 'จัดฉากและสภาพแวดล้อม',
  },
]

export const COMPOSITIONS: Option[] = [
  {
    id: 'negative-space',
    th: 'เว้นที่ให้ข้อความ',
    en: 'Negative space',
    prompt:
      'composition with deliberate negative space on one side for headline placement, subject weighted to the opposite third',
    tags: ['layout', 'space'],
    desc: 'เผื่อพื้นที่สำหรับพาดหัวหรือโลโก้',
  },
  {
    id: 'thirds',
    th: 'กฎสามส่วน',
    en: 'Rule of thirds',
    prompt: 'rule-of-thirds composition, subject on an intersection point, balanced negative space',
    tags: ['balance'],
    desc: 'สมดุลแบบคลาสสิก ปลอดภัย',
  },
  {
    id: 'centered',
    th: 'จัดกลาง',
    en: 'Centered',
    prompt: 'centered symmetrical composition, direct front-on framing, confident stillness',
    tags: ['symmetry'],
    desc: 'แข็งแรง ตรงไปตรงมา',
  },
  {
    id: 'close',
    th: 'โคลสอัป',
    en: 'Close-up',
    prompt: 'tight close-up, shallow depth of field, intimate detail',
    tags: ['detail', 'intimate'],
    desc: 'เน้นรายละเอียดและอารมณ์',
  },
  {
    id: 'wide',
    th: 'ไวด์',
    en: 'Wide shot',
    prompt: 'wide environmental shot, subject in context, layered foreground and background',
    tags: ['context', 'space'],
    desc: 'เห็นบริบทและสถานที่',
  },
  {
    id: 'flatlay',
    th: 'แฟลตเลย์',
    en: 'Flat lay',
    prompt: 'overhead flat-lay composition, precisely arranged objects, even spacing',
    tags: ['topdown', 'product'],
    desc: 'จัดวางจากด้านบน',
  },
  {
    id: 'symmetry',
    th: 'สมมาตร',
    en: 'Symmetry',
    prompt: 'strict symmetrical composition, mirrored elements, architectural balance',
    tags: ['symmetry', 'graphic'],
    desc: 'น่าพอใจและทรงพลัง',
  },
  {
    id: 'over-shoulder',
    th: 'โอเวอร์ชอลเดอร์',
    en: 'Over the shoulder',
    prompt: 'over-the-shoulder framing, subject seen from behind at a slight angle, implied narrative',
    tags: ['narrative'],
    desc: 'ชวนติดตามเรื่องราว',
  },
  {
    id: 'dutch',
    th: 'ดัตช์แองเกิล',
    en: 'Dutch angle',
    prompt: 'subtle dutch angle, dynamic diagonal lines, controlled tension',
    tags: ['dynamic'],
    desc: 'เอียงกล้องเพิ่มพลัง',
  },
  {
    id: 'macro',
    th: 'มาโคร',
    en: 'Macro',
    prompt: 'extreme macro detail, visible material structure, razor-thin focus plane',
    tags: ['texture', 'detail'],
    desc: 'เห็นพื้นผิวระดับใกล้สุด',
  },
]

export const LIGHTINGS: Option[] = [
  {
    id: 'soft-window',
    th: 'แสงหน้าต่างนุ่ม',
    en: 'Soft window light',
    prompt: 'soft directional window light, gentle falloff, natural shadows',
    tags: ['natural', 'soft'],
  },
  {
    id: 'golden',
    th: 'โกลเดนอาวร์',
    en: 'Golden hour',
    prompt: 'warm golden-hour light, long soft shadows, sunlit rim',
    tags: ['warm', 'sun'],
  },
  {
    id: 'softbox',
    th: 'สตูดิโอซอฟต์บ็อกซ์',
    en: 'Studio softbox',
    prompt: 'large studio softbox key light, subtle fill, clean gradient background',
    tags: ['studio', 'clean'],
  },
  {
    id: 'hard-noon',
    th: 'แดดจัดกลางวัน',
    en: 'Hard noon sun',
    prompt: 'hard directional noon sunlight, crisp shadows, high clarity',
    tags: ['hard', 'graphic'],
  },
  {
    id: 'chiaroscuro',
    th: 'สว่าง-มืดจัด',
    en: 'Chiaroscuro',
    prompt: 'chiaroscuro lighting, deep shadow and selective highlight, painterly contrast',
    tags: ['dramatic', 'shadow'],
  },
  {
    id: 'neon',
    th: 'นีออน',
    en: 'Neon',
    prompt: 'neon practical lighting, coloured spill, glossy reflections, night energy',
    tags: ['neon', 'night'],
  },
  {
    id: 'overcast',
    th: 'ฟ้าครึ้ม',
    en: 'Overcast',
    prompt: 'diffused overcast daylight, even illumination, muted natural tones',
    tags: ['soft', 'muted'],
  },
  {
    id: 'practical',
    th: 'ไฟในฉาก',
    en: 'Practical lights',
    prompt: 'in-scene practical lights, warm pools of illumination, lived-in atmosphere',
    tags: ['ambient', 'film'],
  },
  {
    id: 'backlight',
    th: 'ย้อนแสง',
    en: 'Backlight',
    prompt: 'strong backlight, glowing rim, atmospheric haze separation',
    tags: ['rim', 'atmosphere'],
  },
  {
    id: 'ring',
    th: 'ริงไลต์',
    en: 'Ring light',
    prompt: 'beauty ring light, even frontal illumination, crisp catchlights',
    tags: ['beauty', 'even'],
  },
]

export const PALETTES: Option[] = [
  {
    id: 'warm-earth',
    th: 'เอิร์ธโทน',
    en: 'Warm earth',
    prompt: 'warm earth palette of terracotta, sand, olive and deep brown',
    tags: ['earth', 'warm'],
    swatch: ['#c08457', '#e5d5bd', '#6b7a54', '#3b2f2a'],
  },
  {
    id: 'mono',
    th: 'โมโนโครม',
    en: 'Monochrome',
    prompt: 'restrained monochrome palette from black through warm grey',
    tags: ['mono', 'restrained'],
    swatch: ['#111111', '#5c5c5c', '#b8b2a6', '#f2efe7'],
  },
  {
    id: 'pastel',
    th: 'พาสเทล',
    en: 'Pastel',
    prompt: 'soft pastel palette, chalky pink, pistachio and cream',
    tags: ['pastel', 'soft'],
    swatch: ['#f4d6d0', '#d8e8d0', '#f7f0e1', '#c9b8e8'],
  },
  {
    id: 'contrast',
    th: 'คอนทราสต์สูง',
    en: 'High contrast',
    prompt: 'high-contrast palette, deep black with one saturated accent colour',
    tags: ['contrast', 'bold'],
    swatch: ['#0a0a0a', '#ff4a1c', '#f2efe7'],
  },
  {
    id: 'jewel',
    th: 'จิวเวลโทน',
    en: 'Jewel tones',
    prompt: 'jewel-tone palette, emerald, sapphire and burnished gold',
    tags: ['jewel', 'premium'],
    swatch: ['#0f5a4a', '#1d3a6e', '#c8a96a', '#111111'],
  },
  {
    id: 'film',
    th: 'ฟิล์มหมอง',
    en: 'Muted film',
    prompt: 'muted film palette, desaturated greens, warm shadows, gentle highlight roll-off',
    tags: ['film', 'muted'],
    swatch: ['#8a927e', '#d6c6a8', '#5a4a3f', '#2b2b26'],
  },
  {
    id: 'neon-tech',
    th: 'นีออนเทค',
    en: 'Neon tech',
    prompt: 'electric neon palette on deep charcoal, cyan and magenta accents',
    tags: ['neon', 'tech'],
    swatch: ['#0b1220', '#3b82f6', '#ff3bd4', '#c7f9ff'],
  },
  {
    id: 'natural',
    th: 'ธรรมชาติ',
    en: 'Natural',
    prompt: 'natural palette of leaf green, stone and raw linen',
    tags: ['natural', 'green'],
    swatch: ['#6b7a54', '#b9b3a3', '#e5e0d0', '#3f4a35'],
  },
  {
    id: 'sunset',
    th: 'ซันเซ็ต',
    en: 'Sunset',
    prompt: 'sunset palette, apricot, coral and dusty aubergine',
    tags: ['sunset', 'warm'],
    swatch: ['#f2a06a', '#e2635a', '#6e3b52', '#1f1a24'],
  },
]

export const LENSES: Option[] = [
  { id: '24mm', th: '24mm ไวด์', en: '24mm', prompt: 'shot on 24mm wide lens', tags: ['wide'] },
  { id: '35mm', th: '35mm', en: '35mm', prompt: 'shot on 35mm lens, natural perspective', tags: ['natural'] },
  { id: '50mm', th: '50mm', en: '50mm', prompt: 'shot on 50mm lens, true-to-eye perspective', tags: ['classic'] },
  { id: '85mm', th: '85mm พอร์เทรต', en: '85mm', prompt: 'shot on 85mm portrait lens, compressed background', tags: ['portrait'] },
  { id: '100mm', th: '100mm มาโคร', en: '100mm macro', prompt: 'shot on 100mm macro lens, extreme detail', tags: ['macro'] },
  { id: '135mm', th: '135mm', en: '135mm', prompt: 'shot on 135mm telephoto lens, strong compression', tags: ['tele'] },
  { id: 'anamorphic', th: 'อนามอร์ฟิก', en: 'Anamorphic', prompt: 'anamorphic lens, oval bokeh, subtle flare', tags: ['cinema'] },
  { id: 'drone', th: 'โดรน', en: 'Drone', prompt: 'aerial drone perspective, elevated wide view', tags: ['aerial'] },
  { id: 'tilt-shift', th: 'ทิลต์ชิฟต์', en: 'Tilt-shift', prompt: 'tilt-shift lens, selective focus plane, miniature effect', tags: ['effect'] },
  { id: 'none', th: 'ไม่ระบุเลนส์', en: 'No lens', prompt: '', tags: [] },
]

export const MOODS: Option[] = [
  { id: 'calm', th: 'นิ่ง สงบ', en: 'Calm', prompt: 'calm and composed mood', tags: ['calm'] },
  { id: 'bold', th: 'มั่นใจ จัดจ้าน', en: 'Bold', prompt: 'bold, confident mood with visual punch', tags: ['bold'] },
  { id: 'playful', th: 'สนุก ขี้เล่น', en: 'Playful', prompt: 'playful, lighthearted mood', tags: ['playful'] },
  { id: 'premium', th: 'พรีเมียม', en: 'Premium', prompt: 'premium, assured and understated mood', tags: ['premium'] },
  { id: 'nostalgic', th: 'คิดถึงอดีต', en: 'Nostalgic', prompt: 'nostalgic, memory-like mood', tags: ['nostalgic'] },
  { id: 'futuristic', th: 'อนาคต', en: 'Futuristic', prompt: 'futuristic, forward-looking mood', tags: ['future'] },
  { id: 'raw', th: 'ดิบ จริง', en: 'Raw', prompt: 'raw, unpolished and honest mood', tags: ['raw'] },
  { id: 'dreamy', th: 'ฝัน ๆ', en: 'Dreamy', prompt: 'dreamy, softened mood with gentle atmosphere', tags: ['dreamy'] },
  { id: 'warm', th: 'อบอุ่น', en: 'Warm', prompt: 'warm, welcoming mood', tags: ['warm'] },
]

export const CAMERAS: Option[] = [
  { id: 'static', th: 'กล้องนิ่ง', en: 'Static', prompt: 'static camera, locked-off frame' },
  { id: 'slow-push', th: 'ค่อย ๆ ดันเข้า', en: 'Slow push in', prompt: 'slow dolly push-in toward the subject' },
  { id: 'orbit', th: 'วนรอบ', en: 'Orbit', prompt: 'smooth orbit around the subject' },
  { id: 'handheld', th: 'ถือกล้อง', en: 'Handheld', prompt: 'subtle handheld movement, natural breathing' },
  { id: 'tracking', th: 'ตามตัวแบบ', en: 'Tracking', prompt: 'tracking shot following the subject' },
  { id: 'drone', th: 'โดรนบิน', en: 'Drone', prompt: 'slow aerial drone move, rising reveal' },
  { id: 'whip', th: 'แพนเร็ว', en: 'Whip pan', prompt: 'quick whip pan transition' },
]

export const ASPECTS: Option[] = [
  { id: '1:1', th: '1:1 จตุรัส', en: '1:1', tags: ['feed'] },
  { id: '4:5', th: '4:5 ฟีด', en: '4:5', tags: ['feed'] },
  { id: '3:2', th: '3:2 ภาพถ่าย', en: '3:2', tags: ['photo'] },
  { id: '16:9', th: '16:9 จอกว้าง', en: '16:9', tags: ['video'] },
  { id: '9:16', th: '9:16 สตอรี', en: '9:16', tags: ['story'] },
  { id: '2:3', th: '2:3 โปสเตอร์', en: '2:3', tags: ['print'] },
  { id: '21:9', th: '21:9 ซีนีมา', en: '21:9', tags: ['wide'] },
]

export const RATIO_PIXELS: Record<string, { px: string; size: string }> = {
  '1:1': { px: '1080 × 1080 px', size: '1024x1024' },
  '4:5': { px: '1080 × 1350 px', size: '1024x1280' },
  '3:2': { px: '1620 × 1080 px', size: '1536x1024' },
  '16:9': { px: '1920 × 1080 px', size: '1792x1024' },
  '9:16': { px: '1080 × 1920 px', size: '1024x1792' },
  '2:3': { px: '1200 × 1800 px', size: '1024x1536' },
  '21:9': { px: '2520 × 1080 px', size: '1536x640' },
}

export const DEFAULT_INPUT: PromptInput = {
  task: 'image',
  brief: '',
  brand: '',
  audience: '',
  message: '',
  medium: 'product',
  style: 'editorial',
  composition: 'negative-space',
  lighting: 'soft-window',
  palette: 'warm-earth',
  customPalette: '',
  lens: '50mm',
  mood: 'premium',
  camera: 'slow-push',
  aspect: '4:5',
  tool: 'midjourney',
  language: 'th',
  negatives: '',
  avoid: '',
  references: '',
  extraNotes: '',
  variations: 3,
  seriesCount: 6,
  duration: 5,
  seed: '',
  stylize: 150,
  brandKitId: '',
}

export const EXAMPLE_BRIEF =
  'ภาพสินค้าเซรั่มบำรุงผิวจากพืชพรรณไทยในขวดแก้วสีอำพัน วางบนแท่นหินทรายธรรมชาติ มีใบเตยและหยดน้ำเป็นพร็อพ ต้องการภาพที่ดูพรีเมียมแต่เข้าถึงได้สำหรับแคมเปญเปิดตัวสินค้าใหม่'

export function findOption(list: Option[], id: string): Option {
  return list.find((item) => item.id === id) ?? list[0]
}

export function findTask(id: TaskId): TaskOption {
  return TASKS.find((item) => item.id === id) ?? TASKS[0]
}

export function findTool(id: ToolId): ToolOption {
  return TOOLS.find((item) => item.id === id) ?? TOOLS[0]
}

export function detectTaskGroup(task: TaskId): 'image' | 'video' {
  return task === 'video' ? 'video' : 'image'
}
