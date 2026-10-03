import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Eye, X } from 'lucide-react'

/**
 * Full-screen, owner-only preview shell: shows what the caller is currently editing, built entirely
 * from local draft state (no fetch to the backend), so it never lags behind unsaved changes the way
 * navigating to the real published page would.
 */
export function PreviewOverlay({ onClose, children }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-brand-500/30 bg-brand-500/10 px-4 py-3 backdrop-blur">
        <Eye size={16} className="shrink-0 text-brand-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-200">Pre-visualizacao</p>
          <p className="truncate text-xs text-brand-300/70">
            Mostra o que voce esta editando agora, nao a versao publicada.
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn-secondary shrink-0 text-xs">
          <X size={14} /> Fechar
        </button>
      </div>
      {children}
    </div>,
    document.body,
  )
}
