import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  kicker?: string
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  actions?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'wide'
  tone?: 'light' | 'dark'
  className?: string
  bodyClassName?: string
  labelledBy?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({
  open,
  onClose,
  kicker,
  title,
  children,
  footer,
  actions,
  size = 'md',
  tone = 'light',
  className = '',
  bodyClassName = '',
  labelledBy,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<Element | null>(null)
  const generatedTitleId = useId()
  const titleId = labelledBy ?? generatedTitleId

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      target?.focus({ preventScroll: true })
    }, 30)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      )
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
      if (lastFocus.current instanceof HTMLElement) lastFocus.current.focus({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className={`modal-backdrop modal-${tone}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`modal modal-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={!title ? 'หน้าต่างรายละเอียด' : undefined}
        aria-labelledby={title ? titleId : undefined}
      >
        {(kicker || title || actions) && (
          <div className="modal-head">
            <div className="modal-head-copy">
              {kicker && <span className="result-kicker">{kicker}</span>}
              {title && <h3 id={titleId}>{title}</h3>}
            </div>
            <div className="modal-head-actions">
              {actions}
              <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="ปิด">
                <X size={17} />
              </button>
            </div>
          </div>
        )}
        <div className={`modal-body ${bodyClassName}`}>{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
