import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

const WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

/**
 * Dialog rendered in a portal. Escape and the backdrop close it unless `dismissible` is false,
 * which is what the private-course password modal needs.
 */
export function Modal({ open, onClose, title, description, size = 'md', dismissible = true, children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && dismissible) onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)

    // Stop the page behind the dialog from scrolling while it is open.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose, dismissible])

  // Separate from the effect above on purpose: `onClose` is a new function identity on every
  // render of most callers (it's rarely memoized), which would otherwise re-run the focus call on
  // every keystroke of a controlled input inside the modal and yank focus back to the panel.
  // Keying only on `open` means this runs once when the dialog opens, not on every parent re-render.
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className="fixed inset-0 animate-fade-in bg-slate-950/80 backdrop-blur-sm"
        onClick={() => dismissible && onClose?.()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full animate-slide-up rounded-xl border border-slate-700 bg-slate-800 shadow-2xl outline-none',
          WIDTHS[size],
        )}
      >
        {(title || dismissible) && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-700 px-5 py-4">
            <div>
              {title && <h2 className="text-lg font-bold text-slate-100">{title}</h2>}
              {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Confirmation dialog for destructive actions. */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-300">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
          Cancelar
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
