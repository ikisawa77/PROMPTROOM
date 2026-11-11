import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

type Align = 'start' | 'center' | 'end'
type Side = 'bottom' | 'top'

interface PopoverProps {
  label: string
  trigger: (props: {
    ref: RefObject<HTMLButtonElement>
    onClick: () => void
    'aria-expanded': boolean
    'aria-haspopup': 'dialog'
  }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: Align
  side?: Side
  width?: number
  className?: string
  panelRole?: 'dialog' | 'menu' | 'listbox'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface Coords {
  top: number
  left: number
  width: number
  ready: boolean
}

const GAP = 10
const EDGE = 12

export default function Popover({
  label,
  trigger,
  children,
  align = 'end',
  side = 'bottom',
  width,
  className = '',
  panelRole = 'dialog',
  open: controlledOpen,
  onOpenChange,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = useCallback(
    (value: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(value)
      onOpenChange?.(value)
    },
    [controlledOpen, onOpenChange],
  )
  const [coords, setCoords] = useState<Coords>({ top: -9999, left: -9999, width: width ?? 280, ready: false })
  const anchorRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback(
    (restoreFocus = true) => {
      setOpen(false)
      if (restoreFocus) window.setTimeout(() => anchorRef.current?.focus(), 0)
    },
    [setOpen],
  )

  const reposition = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const panelWidth = Math.min(width ?? Math.max(260, rect.width), window.innerWidth - EDGE * 2)
    const panelHeight = panel?.offsetHeight ?? 0

    let left =
      align === 'start' ? rect.left : align === 'end' ? rect.right - panelWidth : rect.left + rect.width / 2 - panelWidth / 2
    left = Math.min(Math.max(left, EDGE), Math.max(EDGE, window.innerWidth - panelWidth - EDGE))

    let top = side === 'bottom' ? rect.bottom + GAP : rect.top - panelHeight - GAP
    if (side === 'bottom' && panelHeight && top + panelHeight > window.innerHeight - EDGE) {
      top = Math.max(EDGE, rect.top - panelHeight - GAP)
    }
    if (side === 'top' && panelHeight && top < EDGE) {
      top = Math.min(window.innerHeight - panelHeight - EDGE, rect.bottom + GAP)
    }
    if (!panelHeight) {
      top = rect.bottom + GAP
    }

    setCoords({ top, left, width: panelWidth, ready: true })
  }, [align, side, width])

  useLayoutEffect(() => {
    if (!open) return
    setCoords((previous) => ({ ...previous, ready: false }))
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current
      if (panel) {
        const rect = anchorRef.current?.getBoundingClientRect()
        if (rect) {
          const panelWidth = Math.min(width ?? Math.max(260, rect.width), window.innerWidth - EDGE * 2)
          panel.style.width = `${panelWidth}px`
        }
      }
      reposition()
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, button, textarea, select, [href], [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, reposition, width])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      close(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close(true)
      }
    }
    const onViewport = () => reposition()

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onViewport)
    window.addEventListener('scroll', onViewport, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onViewport)
      window.removeEventListener('scroll', onViewport, true)
    }
  }, [open, close, reposition])

  return (
    <>
      {trigger({
        ref: anchorRef,
        onClick: () => setOpen(!open),
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
      })}
      {open
        ? createPortal(
            <div
              ref={panelRef}
              role={panelRole}
              aria-label={label}
              className={`popover-panel ${className}`}
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                visibility: coords.ready ? 'visible' : 'hidden',
              }}
            >
              {children(() => close(true))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
