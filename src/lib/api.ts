import type {
  BrandKit,
  GenerateResult,
  PromptInput,
  PromptListItem,
  SavedPrompt,
  Stats,
  Template,
} from '../../shared/types'

export const WORKSPACE_KEY = 'promptroom.workspace'
export const WORKSPACE_LIST_KEY = 'promptroom.workspaces'
const WORKSPACE_PATTERN = /^[a-z0-9-]{1,40}$/

export function normalizeWorkspaceName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function getWorkspace(): string {
  try {
    const value = localStorage.getItem(WORKSPACE_KEY)
    if (value && WORKSPACE_PATTERN.test(value)) return value
  } catch {
    /* ignore */
  }
  return 'demo'
}

export function getWorkspaceList(): string[] {
  try {
    const raw = localStorage.getItem(WORKSPACE_LIST_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    const list = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && WORKSPACE_PATTERN.test(item)) : []
    return Array.from(new Set(['demo', ...list, getWorkspace()]))
  } catch {
    return ['demo', getWorkspace()]
  }
}

export function setWorkspace(name: string): boolean {
  const normalized = normalizeWorkspaceName(name)
  if (!WORKSPACE_PATTERN.test(normalized)) return false
  try {
    localStorage.setItem(WORKSPACE_KEY, normalized)
    const list = getWorkspaceList().filter((item) => item !== normalized)
    localStorage.setItem(WORKSPACE_LIST_KEY, JSON.stringify([normalized, ...list].slice(0, 8)))
    window.dispatchEvent(new CustomEvent('promptroom:workspace', { detail: normalized }))
    return true
  } catch {
    return false
  }
}

function workspace() {
  return getWorkspace()
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'x-workspace': workspace(),
      ...(options.headers ?? {}),
    },
  })
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('promptroom:unauthorized'))
    }
    throw new Error(data.error || `คำขอไม่สำเร็จ (${response.status})`)
  }
  return data
}

export interface Health {
  ok: boolean
  service: string
  version: string
  aiEnabled: boolean
  uptimeSeconds: number
  startedAt: string
}

export const api = {
  health: () => request<Health>('/api/health'),
  stats: () => request<Stats>('/api/stats'),
  templates: () => request<{ templates: Template[] }>('/api/templates'),
  generate: (input: PromptInput) =>
    request<{ id: string; result: GenerateResult; savedAt: string }>('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ input }),
    }),
  prompts: (params: { q?: string; task?: string; tool?: string; favorite?: boolean } = {}) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    if (params.task) search.set('task', params.task)
    if (params.tool) search.set('tool', params.tool)
    if (params.favorite) search.set('favorite', '1')
    return request<{ prompts: PromptListItem[] }>(`/api/prompts?${search.toString()}`)
  },
  prompt: (id: string) => request<{ prompt: SavedPrompt }>(`/api/prompts/${id}`),
  patchPrompt: (id: string, patch: { favorite?: boolean; title?: string }) =>
    request<{ prompt: SavedPrompt }>(`/api/prompts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deletePrompt: (id: string) => request<{ ok: boolean }>(`/api/prompts/${id}`, { method: 'DELETE' }),
  duplicatePrompt: (id: string) =>
    request<{ prompt: SavedPrompt }>(`/api/prompts/${id}/duplicate`, { method: 'POST' }),
  brands: () => request<{ brands: BrandKit[] }>('/api/brands'),
  createBrand: (brand: Omit<BrandKit, 'id' | 'createdAt'>) =>
    request<{ brand: BrandKit }>('/api/brands', { method: 'POST', body: JSON.stringify(brand) }),
  updateBrand: (id: string, brand: Partial<BrandKit>) =>
    request<{ brand: BrandKit }>(`/api/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(brand),
    }),
  deleteBrand: (id: string) => request<{ ok: boolean }>(`/api/brands/${id}`, { method: 'DELETE' }),
  boost: (payload: { masterPrompt: string; toolPrompt: string; tool: string; mode: 'translate' | 'enhance' }) =>
    request<{ text: string; model: string }>('/api/boost', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

export const STUDIO_STORAGE_KEY = 'promptroom.studio.input'
