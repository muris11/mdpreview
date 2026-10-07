import { useCallback, useRef, useState } from 'react'
import type { ToastMessage } from '../components/ToastStack'

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (text: string, tone: ToastMessage['tone'] = 'success') => {
      const id = counter.current++
      setToasts((list) => [...list, { id, text, tone }])
      window.setTimeout(() => dismiss(id), 2600)
    },
    [dismiss],
  )

  return { toasts, notify, dismiss }
}
