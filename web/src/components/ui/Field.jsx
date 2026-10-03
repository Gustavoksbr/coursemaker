import { forwardRef, useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * Live "12/80" character counter, shared by `Field`'s built-in slot and every input that renders
 * its own (block editors, comments, chat messages...) instead of going through `Field`. Colors
 * shift as the limit approaches so it doubles as a soft warning, not just a readout.
 */
export function CharCounter({ value, max, className }) {
  if (max == null) return null
  const length = typeof value === 'string' ? value.length : 0
  const ratio = length / max
  return (
    <span
      className={cn(
        'shrink-0 text-xs tabular-nums',
        ratio >= 1 ? 'text-red-400' : ratio >= 0.9 ? 'text-amber-400' : 'text-slate-500',
        className,
      )}
    >
      {length}/{max}
    </span>
  )
}

/** Label + control + error message, wired together for screen readers. */
export function Field({ label, error, hint, htmlFor, required, children, className, value, maxLength }) {
  const showCounter = maxLength != null && typeof value === 'string'
  return (
    <div className={className}>
      {(label || showCounter) && (
        <div className="flex items-baseline justify-between gap-2">
          {label && (
            <label className="label" htmlFor={htmlFor}>
              {label}
              {required && <span className="ml-0.5 text-red-400">*</span>}
            </label>
          )}
          {showCounter && <CharCounter value={value} max={maxLength} className="mb-1.5" />}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  )
}

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('input', invalid && 'border-red-500 focus:border-red-500 focus:ring-red-500', className)}
      {...props}
    />
  )
})

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'input resize-y',
        invalid && 'border-red-500 focus:border-red-500 focus:ring-red-500',
        className,
      )}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn('input cursor-pointer', className)} {...props}>
      {children}
    </select>
  )
})

/** Checkbox with its label, sharing one generated id. */
export function Checkbox({ label, description, className, ...props }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-600 bg-slate-900
          text-brand-500 focus:ring-brand-500"
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </label>
    </div>
  )
}
