export type TaskId =
  | 'image'
  | 'series'
  | 'video'
  | 'campaign'
  | 'design'
  | 'debug'
  | 'adapt'

export type ToolId =
  | 'midjourney'
  | 'flux'
  | 'firefly'
  | 'ideogram'
  | 'stable-diffusion'
  | 'dalle'
  | 'runway'
  | 'kling'
  | 'sora'
  | 'generic'

export type LanguageId = 'th' | 'en'

export interface PromptInput {
  task: TaskId
  brief: string
  brand: string
  audience: string
  message: string
  medium: string
  style: string
  composition: string
  lighting: string
  palette: string
  customPalette: string
  lens: string
  mood: string
  camera: string
  aspect: string
  tool: ToolId
  language: LanguageId
  negatives: string
  avoid: string
  references: string
  extraNotes: string
  variations: number
  seriesCount: number
  duration: number
  seed: string
  stylize: number
  brandKitId: string
}

export interface Variation {
  id: string
  name: string
  nameEn: string
  angle: string
  prompt: string
  when: string
}

export interface SeriesRow {
  no: number
  beat: string
  scene: string
  action: string
  framing: string
  lens: string
}

export interface ShotRow {
  no: number
  time: string
  shot: string
  action: string
  camera: string
  lens: string
}

export interface GenerateResult {
  title: string
  summary: string
  task: TaskId
  tool: ToolId
  style: string
  toolName: string
  masterPrompt: string
  toolPrompt: string
  toolPromptTh: string
  negativePrompt: string
  parameterLine: string
  variations: Variation[]
  series: SeriesRow[]
  shots: ShotRow[]
  checks: string[]
  toolNotes: string[]
  tips: string[]
  keywords: string[]
  input: PromptInput
  createdAt: string
}

export interface SavedPrompt {
  id: string
  workspace: string
  title: string
  task: TaskId
  tool: ToolId
  style: string
  brief: string
  favorite: boolean
  input: PromptInput
  result: GenerateResult
  createdAt: string
  updatedAt: string
}

export interface PromptListItem {
  id: string
  title: string
  task: TaskId
  tool: ToolId
  toolName: string
  style: string
  styleName: string
  brief: string
  favorite: boolean
  createdAt: string
}

export interface BrandKit {
  id: string
  name: string
  industry: string
  audience: string
  tone: string
  palette: string[]
  keywords: string
  avoid: string
  createdAt: string
}

export interface Template {
  id: string
  title: string
  tag: string
  description: string
  swatch: string[]
  featured?: boolean
  input: Partial<PromptInput>
}

export interface Stats {
  saved: number
  favorites: number
  brands: number
  tools: number
  byTask: { task: TaskId; count: number }[]
  recent: PromptListItem[]
  aiEnabled: boolean
}
