import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

interface ModalProps {
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Modal({ onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previouslyFocused.current?.focus?.()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function trapFocus(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={trapFocus}
        className="relative w-full max-w-lg rounded-lg border border-border bg-surface shadow-lg outline-none"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold text-fg">{title}</h2>
          <Button
            variant="ghost"
            size="md"
            aria-label="Cerrar"
            className="shrink-0 px-2.5"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}