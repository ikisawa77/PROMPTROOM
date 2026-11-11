import type { ToolId } from '../../shared/types'

interface Theme {
  bg: string
  fg: string
  short: string
}

const THEMES: Record<ToolId, Theme> = {
  midjourney: { bg: '#101010', fg: '#f2efe7', short: 'MJ' },
  flux: { bg: '#111111', fg: '#d8ff4f', short: 'FL' },
  firefly: { bg: '#ff4a1c', fg: '#fff7ef', short: 'FF' },
  ideogram: { bg: '#f2efe7', fg: '#111111', short: 'ID' },
  'stable-diffusion': { bg: '#6c5cff', fg: '#ffffff', short: 'SD' },
  dalle: { bg: '#10a37f', fg: '#ffffff', short: 'DE' },
  runway: { bg: '#141414', fg: '#ff4a1c', short: 'RW' },
  kling: { bg: '#1f6feb', fg: '#ffffff', short: 'KL' },
  sora: { bg: '#0ea5e9', fg: '#06263a', short: 'SO' },
  generic: { bg: '#504c44', fg: '#f2efe7', short: 'AI' },
}

function Glyph({ id }: { id: ToolId }) {
  switch (id) {
    case 'midjourney':
      return (
        <>
          <path d="M12 4v11" />
          <path d="M12 5.5 5 15h7" />
          <path d="M12 7.5 18 15h-6" />
          <path d="M4 18c2.4 1.6 4.8 1.6 8 0s5.6-1.6 8 0" />
        </>
      )
    case 'flux':
      return (
        <>
          <path d="M4 8c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 4 0" />
          <path d="M4 13c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 4 0" />
          <path d="M6 18h12" />
        </>
      )
    case 'firefly':
      return (
        <>
          <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z" />
          <circle cx="18.5" cy="5.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="5.5" cy="17" r="1.1" fill="currentColor" stroke="none" />
        </>
      )
    case 'ideogram':
      return (
        <>
          <path d="M7 6h10M12 6v12M7 18h10" />
          <circle cx="4.4" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="19.6" cy="18" r="1" fill="currentColor" stroke="none" />
        </>
      )
    case 'stable-diffusion':
      return (
        <>
          <circle cx="7" cy="7" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="7" r="1.1" fill="currentColor" stroke="none" opacity=".8" />
          <circle cx="17" cy="7" r=".8" fill="currentColor" stroke="none" opacity=".6" />
          <circle cx="7" cy="12" r="1.1" fill="currentColor" stroke="none" opacity=".8" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="17" cy="12" r="1.1" fill="currentColor" stroke="none" opacity=".8" />
          <circle cx="7" cy="17" r=".8" fill="currentColor" stroke="none" opacity=".6" />
          <circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" opacity=".8" />
          <circle cx="17" cy="17" r="1.4" fill="currentColor" stroke="none" />
        </>
      )
    case 'dalle':
      return (
        <>
          <path d="M12 4a8 8 0 1 0 7.4 5" />
          <path d="M16 4.2c2.2.4 4 1.6 4 3.3 0 2.2-2.7 4-6 4" />
          <circle cx="9.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
        </>
      )
    case 'runway':
      return (
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="2.4" />
          <path d="m10.4 9.4 4.4 2.6-4.4 2.6Z" fill="currentColor" stroke="none" />
        </>
      )
    case 'kling':
      return (
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="2" />
          <path d="M7.5 6v12M16.5 6v12M3.5 10h4M3.5 14h4M16.5 10h4M16.5 14h4" />
        </>
      )
    case 'sora':
      return (
        <>
          <ellipse cx="12" cy="12" rx="8" ry="4.2" transform="rotate(-24 12 12)" />
          <circle cx="12" cy="12" r="2.6" />
          <circle cx="19" cy="8.4" r="1.2" fill="currentColor" stroke="none" />
        </>
      )
    default:
      return (
        <>
          <path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" />
        </>
      )
  }
}

export function toolTheme(id: ToolId): Theme {
  return THEMES[id] ?? THEMES.generic
}

export default function ToolIcon({
  id,
  size = 30,
  className = '',
  rounded = true,
}: {
  id: ToolId
  size?: number
  className?: string
  rounded?: boolean
}) {
  const theme = toolTheme(id)
  return (
    <span
      className={`tool-icon${rounded ? ' is-rounded' : ''} ${className}`}
      style={{ width: size, height: size, background: theme.bg, color: theme.fg }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Glyph id={id} />
      </svg>
    </span>
  )
}
