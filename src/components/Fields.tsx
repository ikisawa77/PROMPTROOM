import type { CSSProperties, ReactNode } from 'react'
import { Info } from 'lucide-react'
import Popover from './ui/Popover'

export function Field({
  label,
  hint,
  tip,
  children,
  className = '',
}: {
  label: string
  hint?: string
  tip?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`field ${className}`}>
      <div className="field-head">
        <span className="field-label">
          {label}
          {tip && (
            <Popover
              label={`คำอธิบาย ${label}`}
              align="start"
              width={280}
              className="field-tip-pop"
              trigger={(props) => (
                <button type="button" className="field-tip" aria-label={`คำอธิบาย ${label}`} {...props}>
                  <Info size={12} />
                </button>
              )}
            >
              {() => <p className="field-tip-text">{tip}</p>}
            </Popover>
          )}
        </span>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input textarea ${props.className ?? ''}`} />
}

export function Select({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  ariaLabel?: string
}) {
  return (
    <div className="select-wrap">
      <select className="input select" value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel}>
        {children}
      </select>
    </div>
  )
}

interface OptionLike {
  id: string
  th: string
  desc?: string
  swatch?: string[]
  en?: string
  icon?: ReactNode
  badge?: string
}

export function ChipGroup({
  options,
  value,
  onChange,
  withSwatch = false,
  allowCustom = false,
}: {
  options: OptionLike[]
  value: string
  onChange: (value: string) => void
  withSwatch?: boolean
  allowCustom?: boolean
}) {
  return (
    <div className="chip-group">
      {options.map((option) => (
        <button
          type="button"
          key={option.id}
          className={`chip${value === option.id ? ' is-active' : ''}`}
          onClick={() => onChange(option.id)}
          title={option.desc}
        >
          {withSwatch && option.swatch && (
            <span className="chip-swatch" style={{ background: option.swatch[1] ?? option.swatch[0] }} />
          )}
          {option.th}
        </button>
      ))}
      {allowCustom && (
        <button
          type="button"
          className={`chip${value === 'custom' ? ' is-active' : ''}`}
          onClick={() => onChange('custom')}
        >
          กำหนดเอง
        </button>
      )}
    </div>
  )
}

export function OptionGrid({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: OptionLike[]
  value: string
  onChange: (value: string) => void
  columns?: number
}) {
  return (
    <div className="option-grid" style={{ '--cols': columns } as CSSProperties}>
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            type="button"
            key={option.id}
            className={`option-card${active ? ' is-active' : ''}${option.icon ? ' has-icon' : ''}`}
            onClick={() => onChange(option.id)}
          >
            {option.icon && <span className="option-icon">{option.icon}</span>}
            {option.swatch && (
              <span className="option-swatch">
                {option.swatch.slice(0, 4).map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
            )}
            <span className="option-copy">
              <span className="option-title">
                {option.th}
                {option.badge && <em className="option-badge">{option.badge}</em>}
              </span>
              {option.desc && <span className="option-desc">{option.desc}</span>}
              {!option.desc && option.en && <span className="option-desc">{option.en}</span>}
            </span>
            <span className="option-check" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

export function RangeField({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
  hint,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
  hint?: string
}) {
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <div className="range-field">
      <div className="range-top">
        <strong>
          {value}
          {suffix}
        </strong>
        <span>{hint}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--range-progress': `${progress}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
