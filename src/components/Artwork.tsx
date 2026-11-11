import { useId } from 'react'

export type ArtVariant = 'sun' | 'arc' | 'pedestal' | 'grid' | 'bloom' | 'horizon'

const VARIANTS: ArtVariant[] = ['sun', 'arc', 'pedestal', 'grid', 'bloom', 'horizon']

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

export default function Artwork({
  swatch,
  seed = 'promptroom',
  variant,
  className = '',
}: {
  swatch: string[]
  seed?: string
  variant?: ArtVariant
  className?: string
}) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const colors = (swatch.length >= 3 ? swatch : ['#e8ded2', '#8c3b2e', '#2f2a26']).slice(0, 4)
  const [light, mid, dark] = colors
  const chosen = variant ?? VARIANTS[hashString(seed) % VARIANTS.length]
  const lightIsBright = luminance(light) > 0.55
  const ink = lightIsBright ? dark : light
  const inkSoft = lightIsBright ? 'rgba(17,17,17,0.5)' : 'rgba(242,239,231,0.55)'

  return (
    <svg
      className={`artwork-svg ${className}`}
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="48%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`glow-${uid}`} cx="0.5" cy="0.35" r="0.72">
          <stop offset="0%" stopColor={light} stopOpacity="0.5" />
          <stop offset="100%" stopColor={dark} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`shade-${uid}`} cx="0.5" cy="1" r="0.9">
          <stop offset="0%" stopColor={dark} stopOpacity="0.72" />
          <stop offset="100%" stopColor={dark} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="48%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`grain-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="400" height="500" fill={`url(#bg-${uid})`} />

      {chosen === 'sun' && (
        <g>
          <circle cx="292" cy="132" r="104" fill={light} opacity="0.88" />
          <circle cx="292" cy="132" r="104" fill="none" stroke={ink} strokeOpacity="0.22" strokeWidth="1.5" />
          <rect y="296" width="400" height="204" fill={dark} opacity="0.42" />
          <path d="M-20 424 Q 200 244 420 424" fill="none" stroke={ink} strokeOpacity="0.34" strokeWidth="1.4" />
          <path d="M-20 458 Q 200 300 420 458" fill="none" stroke={ink} strokeOpacity="0.2" strokeWidth="1" />
          <path d="M124 432V266" stroke={ink} strokeOpacity="0.58" strokeWidth="1.6" />
          <ellipse cx="101" cy="300" rx="30" ry="11" transform="rotate(-28 101 300)" fill={mid} opacity="0.9" />
          <ellipse cx="149" cy="336" rx="32" ry="12" transform="rotate(24 149 336)" fill={light} opacity="0.72" />
          <ellipse cx="102" cy="372" rx="26" ry="10" transform="rotate(-18 102 372)" fill={mid} opacity="0.8" />
          <rect x="286" y="352" width="58" height="58" fill={light} opacity="0.9" />
          <rect x="286" y="352" width="58" height="58" fill="none" stroke={ink} strokeOpacity="0.3" />
        </g>
      )}

      {chosen === 'arc' && (
        <g>
          <path d="M-40 430 A 320 320 0 0 1 440 430" fill="none" stroke={ink} strokeOpacity="0.3" strokeWidth="1.5" />
          <path d="M24 430 A 256 256 0 0 1 376 430" fill="none" stroke={ink} strokeOpacity="0.22" strokeWidth="1" />
          <path d="M96 430 A 184 184 0 0 1 304 430" fill="none" stroke={ink} strokeOpacity="0.16" strokeWidth="1" />
          <path d="M-10 60 L410 300" stroke={ink} strokeOpacity="0.28" strokeWidth="48" />
          <circle cx="300" cy="168" r="66" fill={dark} opacity="0.55" />
          <circle cx="300" cy="168" r="66" fill="none" stroke={light} strokeOpacity="0.6" strokeWidth="1.2" />
          <rect x="62" y="330" width="90" height="120" fill={dark} opacity="0.5" />
          <rect x="62" y="330" width="90" height="120" fill="none" stroke={ink} strokeOpacity="0.28" />
          <circle cx="107" cy="390" r="24" fill={light} opacity="0.85" />
          <path d="M250 432V286" stroke={ink} strokeOpacity="0.45" strokeWidth="1.3" />
          <circle cx="250" cy="270" r="9" fill={light} opacity="0.9" />
        </g>
      )}

      {chosen === 'pedestal' && (
        <g>
          <circle cx="200" cy="212" r="132" fill={light} opacity="0.3" />
          <circle cx="200" cy="212" r="132" fill="none" stroke={ink} strokeOpacity="0.2" />
          <ellipse cx="200" cy="424" rx="132" ry="24" fill={dark} opacity="0.5" />
          <rect x="118" y="408" width="164" height="18" fill={light} opacity="0.6" />
          <rect x="152" y="206" width="96" height="206" rx="12" fill={light} opacity="0.94" />
          <rect x="152" y="206" width="96" height="206" rx="12" fill="none" stroke={dark} strokeOpacity="0.25" />
          <rect x="184" y="168" width="32" height="46" rx="5" fill={light} opacity="0.94" />
          <rect x="180" y="154" width="40" height="18" rx="4" fill={dark} opacity="0.65" />
          <rect x="170" y="300" width="60" height="74" rx="3" fill={dark} opacity="0.34" />
          <path d="M178 320h44M178 332h34M178 344h40" stroke={light} strokeOpacity="0.55" strokeWidth="2" />
          <rect x="160" y="220" width="8" height="170" rx="4" fill={`url(#sheen-${uid})`} opacity="0.7" />
          <path d="M124 424V318" stroke={ink} strokeOpacity="0.5" strokeWidth="1.4" />
          <ellipse cx="104" cy="350" rx="30" ry="11" transform="rotate(-32 104 350)" fill={mid} opacity="0.92" />
          <ellipse cx="144" cy="386" rx="26" ry="10" transform="rotate(26 144 386)" fill={light} opacity="0.7" />
          <path d="M276 424V330" stroke={ink} strokeOpacity="0.5" strokeWidth="1.4" />
          <ellipse cx="296" cy="356" rx="30" ry="11" transform="rotate(32 296 356)" fill={mid} opacity="0.92" />
        </g>
      )}

      {chosen === 'grid' && (
        <g>
          <rect x="0" y="0" width="128" height="500" fill={dark} opacity="0.34" />
          <rect x="272" y="0" width="128" height="500" fill={light} opacity="0.18" />
          <path d="M128 0v500M272 0v500M0 168h400M0 336h400" stroke={ink} strokeOpacity="0.24" />
          <circle cx="200" cy="252" r="88" fill="none" stroke={ink} strokeOpacity="0.55" strokeWidth="1.4" />
          <circle cx="200" cy="252" r="54" fill={light} opacity="0.9" />
          <path d="M156 336h88" stroke={ink} strokeOpacity="0.5" strokeWidth="8" />
          <path d="M160 356h56M160 370h72" stroke={ink} strokeOpacity="0.35" strokeWidth="4" />
          <rect x="34" y="380" width="60" height="60" fill={light} opacity="0.8" />
          <rect x="306" y="52" width="46" height="46" fill={dark} opacity="0.7" />
          <path d="M200 60v88M200 356v84" stroke={ink} strokeOpacity="0.4" />
        </g>
      )}

      {chosen === 'bloom' && (
        <g>
          <circle cx="200" cy="238" r="140" fill={`url(#glow-${uid})`} />
          {Array.from({ length: 10 }).map((_, index) => {
            const angle = (index * 36 + 9) % 360
            return (
              <ellipse
                key={index}
                cx="200"
                cy="168"
                rx="30"
                ry="82"
                fill={index % 2 === 0 ? light : mid}
                opacity={index % 2 === 0 ? 0.82 : 0.56}
                transform={`rotate(${angle} 200 238)`}
              />
            )
          })}
          <circle cx="200" cy="238" r="44" fill={dark} opacity="0.6" />
          <circle cx="200" cy="238" r="44" fill="none" stroke={light} strokeOpacity="0.55" />
          <path d="M200 424V282" stroke={ink} strokeOpacity="0.55" strokeWidth="2" />
          <path d="M200 360c-44 0-68-18-82-44 34 2 64 14 82 44Z" fill={mid} opacity="0.86" />
          <path d="M200 396c42 0 66-16 80-40-32 2-60 12-80 40Z" fill={light} opacity="0.6" />
        </g>
      )}

      {chosen === 'horizon' && (
        <g>
          <circle cx="200" cy="268" r="94" fill={light} opacity="0.9" />
          <path d="M0 268h400" stroke={dark} strokeOpacity="0.35" />
          <path d="M0 268 120 196l88 62 96-84 96 94v232H0Z" fill={dark} opacity="0.45" />
          <path d="M0 320c58-26 102-26 148 0s92 26 140 0 78-24 112-10v190H0Z" fill={mid} opacity="0.66" />
          <path d="M0 372c64-22 110-22 158 0s96 22 144 0 70-18 98-8v136H0Z" fill={dark} opacity="0.55" />
          <path d="M200 268v132" stroke={light} strokeOpacity="0.55" strokeWidth="2" />
          <path d="M240 420 244 318m0 0 22-32m-22 32-26-30" stroke={ink} strokeOpacity="0.5" strokeWidth="1.2" />
          <circle cx="318" cy="128" r="3" fill={light} />
          <circle cx="96" cy="102" r="2" fill={light} opacity="0.8" />
        </g>
      )}

      <rect width="400" height="500" fill={`url(#glow-${uid})`} opacity="0.55" />
      <rect y="300" width="400" height="200" fill={`url(#shade-${uid})`} />
      <rect width="400" height="500" filter={`url(#grain-${uid})`} opacity="0.14" style={{ mixBlendMode: 'overlay' }} />
      <rect x="14" y="14" width="372" height="472" fill="none" stroke={inkSoft} strokeOpacity="0.5" />
    </svg>
  )
}
