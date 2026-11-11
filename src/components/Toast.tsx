import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'

type Tone = 'default' | 'success' | 'error' | 'info' | 'warn'
interface ToastItem {
  id: number
  message: string
  tone: Tone
  detail?: string
}

interface ToastApi {
  show: (message: string, tone?: Tone, detail?: string) => void
}

const ToastContext = createContext<ToastApi>({ show: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setItems((previous) => previous.filter((item) => item.id !== id))
  }, [])

  const show = useCallback((message: string, tone: Tone = 'default', detail?: string) => {
    const id = Date.now() + Math.random()
    setItems((previous) => [...previous.slice(-3), { id, message, tone, detail }])
    window.setTimeout(() => {
      setItems((previous) => previous.filter((item) => item.id !== id))
    }, tone === 'error' ? 5200 : 3400)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.tone}`}>
            <span className="toast-icon">
              {item.tone === 'error' ? (
                <TriangleAlert size={13} />
              ) : item.tone === 'info' ? (
                <Info size={13} />
              ) : (
                <Check size={13} />
              )}
            </span>
            <span className="toast-copy">
              <span>{item.message}</span>
              {item.detail && <em>{item.detail}</em>}
            </span>
            <button type="button" className="toast-close" onClick={() => dismiss(item.id)} aria-label="ปิดการแจ้งเตือน">
              <X size={12} />
            </button>
            <i className="toast-progress" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
