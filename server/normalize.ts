import type { PromptInput, TaskId, ToolId } from '../shared/types'
import { DEFAULT_INPUT, TASKS, TOOLS, STYLES, MEDIUMS, COMPOSITIONS, LIGHTINGS, LENSES, MOODS, CAMERAS, ASPECTS } from '../shared/options'

const TASK_IDS = new Set(TASKS.map((item) => item.id))
const TOOL_IDS = new Set(TOOLS.map((item) => item.id))
const STYLE_IDS = new Set(STYLES.map((item) => item.id))
const MEDIUM_IDS = new Set(MEDIUMS.map((item) => item.id))
const COMPOSITION_IDS = new Set(COMPOSITIONS.map((item) => item.id))
const LIGHTING_IDS = new Set(LIGHTINGS.map((item) => item.id))
const LENS_IDS = new Set(LENSES.map((item) => item.id))
const MOOD_IDS = new Set(MOODS.map((item) => item.id))
const CAMERA_IDS = new Set(CAMERAS.map((item) => item.id))
const ASPECT_IDS = new Set(ASPECTS.map((item) => item.id))

function text(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.slice(0, max).trim() : ''
}

function oneOf<T extends string>(value: unknown, allowed: Set<string>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : fallback
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.round(parsed), min), max)
}

export function normalizeInput(raw: unknown): PromptInput {
  const body = (raw ?? {}) as Record<string, unknown>
  const palette = text(body.palette, 40) || DEFAULT_INPUT.palette
  return {
    task: oneOf<TaskId>(body.task, TASK_IDS, DEFAULT_INPUT.task),
    brief: text(body.brief, 4000),
    brand: text(body.brand, 120),
    audience: text(body.audience, 240),
    message: text(body.message, 240),
    medium: oneOf(body.medium, MEDIUM_IDS, DEFAULT_INPUT.medium),
    style: oneOf(body.style, STYLE_IDS, DEFAULT_INPUT.style),
    composition: oneOf(body.composition, COMPOSITION_IDS, DEFAULT_INPUT.composition),
    lighting: oneOf(body.lighting, LIGHTING_IDS, DEFAULT_INPUT.lighting),
    palette: palette === 'custom' ? 'custom' : oneOf(palette, new Set(['warm-earth', 'mono', 'pastel', 'contrast', 'jewel', 'film', 'neon-tech', 'natural', 'sunset']), DEFAULT_INPUT.palette),
    customPalette: text(body.customPalette, 240),
    lens: oneOf(body.lens, LENS_IDS, DEFAULT_INPUT.lens),
    mood: oneOf(body.mood, MOOD_IDS, DEFAULT_INPUT.mood),
    camera: oneOf(body.camera, CAMERA_IDS, DEFAULT_INPUT.camera),
    aspect: oneOf(body.aspect, ASPECT_IDS, DEFAULT_INPUT.aspect),
    tool: oneOf<ToolId>(body.tool, TOOL_IDS, DEFAULT_INPUT.tool),
    language: body.language === 'en' ? 'en' : 'th',
    negatives: text(body.negatives, 800),
    avoid: text(body.avoid, 800),
    references: text(body.references, 800),
    extraNotes: text(body.extraNotes, 1200),
    variations: number(body.variations, DEFAULT_INPUT.variations, 2, 4),
    seriesCount: number(body.seriesCount, DEFAULT_INPUT.seriesCount, 3, 8),
    duration: number(body.duration, DEFAULT_INPUT.duration, 5, 60),
    seed: text(body.seed, 30).replace(/[^0-9]/g, '').slice(0, 12),
    stylize: number(body.stylize, DEFAULT_INPUT.stylize, 0, 1000),
    brandKitId: text(body.brandKitId, 60),
  }
}

export function normalizeWorkspace(value: unknown): string {
  const raw = typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : ''
  return raw || 'demo'
}
