import { useCallback, useEffect, useRef, useState } from 'react'
import type { ToastMessage } from '../components/ToastStack'

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const counter = useRef(0)
  const timers = useRef(new Set<number>())

  // Every auto-dismiss timer is tracked so a clean unmount can drop them all
  // instead of letting them fire into a state that no longer exists.
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
      pending.clear()
    }
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (text: string, tone: ToastMessage['tone'] = 'success') => {
      const id = counter.current++
      setToasts((list) => [...list, { id, text, tone }])
      const timer = window.setTimeout(() => {
        timers.current.delete(timer)
        dismiss(id)
      }, 2600)
      timers.current.add(timer)
    },
    [dismiss],
  )

  return { toasts, notify, dismiss }
}
