import { useReveal } from '@/hooks/useReveal'
import { cn } from '@/lib/cn'

/**
 * Fades and lifts its children into place the first time they scroll into view. `delayMs` staggers
 * siblings so a row of cards arrives in sequence instead of all at once.
 */
export function Reveal({ children, delayMs = 0, className, as: Tag = 'div' }) {
  const [ref, revealed] = useReveal()

  return (
    <Tag
      ref={ref}
      style={revealed && delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:transition-none',
        revealed ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
