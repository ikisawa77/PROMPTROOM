type Scene = 'stack' | 'camera' | 'bottle' | 'compass' | 'search'

export default function Illustration({
  scene = 'stack',
  className = '',
}: {
  scene?: Scene
  className?: string
}) {
  return (
    <svg
      className={`illustration ${className}`}
      viewBox="0 0 240 180"
      role="img"
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {scene === 'stack' && (
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="34" y="62" width="104" height="76" rx="6" fill="var(--paper-3)" />
          <rect x="60" y="48" width="104" height="76" rx="6" fill="var(--paper-2)" />
          <rect x="86" y="34" width="104" height="76" rx="6" fill="var(--ink)" stroke="var(--ink)" />
          <path d="M104 56h42" stroke="var(--lime)" />
          <path d="M104 68h68" stroke="rgba(242,239,231,.55)" />
          <path d="M104 78h52" stroke="rgba(242,239,231,.35)" />
          <path d="M104 88h60" stroke="rgba(242,239,231,.35)" />
          <circle cx="104" cy="99" r="3" fill="var(--accent)" stroke="none" />
          <path d="M190 122v14M183 129h14" stroke="var(--accent)" />
          <path d="M30 140h54" stroke="var(--line-strong)" />
        </g>
      )}
      {scene === 'camera' && (
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="38" y="54" width="164" height="96" rx="8" fill="var(--paper-3)" />
          <path d="M92 54l10-14h36l10 14" fill="var(--paper-2)" />
          <circle cx="120" cy="102" r="30" fill="var(--paper-2)" />
          <circle cx="120" cy="102" r="18" fill="var(--ink)" stroke="var(--ink)" />
          <circle cx="113" cy="95" r="5" fill="var(--lime)" stroke="none" />
          <circle cx="176" cy="74" r="4" fill="var(--accent)" stroke="none" />
          <path d="M52 74h18" stroke="var(--accent)" />
          <path d="M52 132h30" stroke="var(--line-strong)" />
        </g>
      )}
      {scene === 'bottle' && (
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M104 34h32v18l10 14v74a8 8 0 0 1-8 8h-36a8 8 0 0 1-8-8V66l10-14z" fill="var(--paper-3)" />
          <path d="M112 52h16" stroke="var(--line-strong)" />
          <path d="M102 92h36v40h-36z" fill="var(--paper-2)" />
          <path d="M108 100h24M108 110h18M108 120h22" stroke="var(--line-strong)" />
          <path d="M62 138c14-26 26-38 34-40M178 138c-16-22-28-34-38-40" stroke="var(--accent)" />
          <path d="M96 98c-18-4-28-16-30-30 16 2 28 12 30 30z" fill="var(--lime)" stroke="var(--ink)" />
          <path d="M150 106c18-2 30-12 34-26-16 0-30 8-34 26z" fill="var(--lime)" stroke="var(--ink)" />
        </g>
      )}
      {scene === 'compass' && (
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="120" cy="90" r="52" fill="var(--paper-3)" />
          <circle cx="120" cy="90" r="36" stroke="var(--line-strong)" />
          <path d="M120 50v10M120 120v10M80 90h10M150 90h10" stroke="var(--line-strong)" />
          <path d="M138 72l-8 30-30 10 8-30 30-10z" fill="var(--accent)" stroke="var(--ink)" />
          <circle cx="120" cy="90" r="4" fill="var(--ink)" stroke="none" />
          <path d="M42 146c26-12 54-12 78 0s52 12 78 0" stroke="var(--line-strong)" strokeDasharray="4 5" />
        </g>
      )}
      {scene === 'search' && (
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="44" y="42" width="80" height="58" rx="5" fill="var(--paper-3)" />
          <path d="M58 58h44M58 70h52M58 82h34" stroke="var(--line-strong)" />
          <rect x="66" y="68" width="80" height="58" rx="5" fill="var(--paper-2)" />
          <path d="M80 84h44M80 96h52M80 108h30" stroke="var(--line-strong)" />
          <circle cx="158" cy="112" r="26" fill="var(--paper-3)" />
          <circle cx="158" cy="112" r="26" stroke="var(--accent)" strokeWidth="2" />
          <path d="M177 131l16 16" stroke="var(--accent)" strokeWidth="3" />
          <path d="M148 112h20M158 102v20" stroke="var(--line-strong)" />
        </g>
      )}
    </svg>
  )
}
