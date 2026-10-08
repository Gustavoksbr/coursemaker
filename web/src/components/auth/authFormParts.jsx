import { useEffect, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { googleLoginEnabled } from './GoogleButton'

export function FormError({ children }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div className="space-y-1">{children}</div>
    </div>
  )
}

/** "ou" rule above the Google button; renders nothing when Google sign-in is not configured. */
export function OrDivider() {
  if (!googleLoginEnabled) return null
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
      <span className="h-px flex-1 bg-slate-700" />
      ou
      <span className="h-px flex-1 bg-slate-700" />
    </div>
  )
}

/**
 * Focuses the returned ref's element once the dialog is up. Deferred a tick because <Modal> moves
 * focus to its own panel in an effect that runs after this one.
 */
export function useAutoFocus() {
  const ref = useRef(null)
  useEffect(() => {
    const timer = setTimeout(() => ref.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [])
  return ref
}

/** A link-looking button that swaps the dialog to another view. */
export function SwitchLink({ onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-semibold text-brand-400 hover:text-brand-300 ${className}`}
    >
      {children}
    </button>
  )
}
