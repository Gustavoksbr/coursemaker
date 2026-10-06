import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Painel que desliza da esquerda e leva o menu de aulas para telas estreitas, onde a barra lateral
 * fixa nao cabe. Fecha com Escape, ao tocar no fundo escurecido e pelo botao; trava a rolagem da
 * pagina enquanto esta aberto e devolve o foco ao botao que o abriu.
 */
export function SidebarDrawer({ open, onClose, title = 'Conteudo do curso', children }) {
  const panelRef = useRef(null)
  const openerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    openerRef.current = document.activeElement
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      openerRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col border-r border-slate-700 bg-slate-900 shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
