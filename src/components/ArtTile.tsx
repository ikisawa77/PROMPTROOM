import type { ReactNode } from 'react'
import Artwork, { type ArtVariant } from './Artwork'

interface Props {
  swatch: string[]
  label?: string
  index?: string
  ratio?: 'portrait' | 'square' | 'wide' | 'fill'
  variant?: ArtVariant
  seed?: string
  className?: string
  children?: ReactNode
}

export default function ArtTile({
  swatch,
  label,
  index,
  ratio = 'portrait',
  variant,
  seed,
  className = '',
  children,
}: Props) {
  return (
    <div className={`art-tile art-${ratio} ${className}`}>
      <Artwork swatch={swatch} variant={variant} seed={seed ?? `${swatch.join('-')}-${index ?? label ?? ''}`} />
      {index && <span className="art-index">{index}</span>}
      {label && <span className="art-label">{label}</span>}
      {children}
    </div>
  )
}
