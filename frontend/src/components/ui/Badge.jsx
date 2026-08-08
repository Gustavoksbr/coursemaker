import { Lock, Sparkles, FileEdit } from 'lucide-react'
import { cn } from '@/lib/cn'
import { STATUS, VISIBILITY } from '@/lib/constants'

const TONES = {
  draft: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30',
  private: 'bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-500/30',
  featured: 'bg-green-500/15 text-green-300 ring-1 ring-inset ring-green-500/30',
  neutral: 'bg-slate-700/60 text-slate-300',
  brand: 'bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/30',
}

export function Badge({ tone = 'neutral', className, children, ...props }) {
  return (
    <span className={cn('badge', TONES[tone], className)} {...props}>
      {children}
    </span>
  )
}

/** The draft / private / featured badges a course or post card shows, in a fixed order. */
export function ContentBadges({ status, visibility, featured, className }) {
  const badges = []
  if (status === STATUS.UNAVAILABLE) {
    badges.push(
      <Badge key="draft" tone="draft">
        <FileEdit size={12} /> Rascunho
      </Badge>,
    )
  }
  if (visibility === VISIBILITY.PRIVATE) {
    badges.push(
      <Badge key="private" tone="private">
        <Lock size={12} /> Privado
      </Badge>,
    )
  }
  if (featured) {
    badges.push(
      <Badge key="featured" tone="featured">
        <Sparkles size={12} /> Destaque
      </Badge>,
    )
  }
  if (badges.length === 0) return null
  return <div className={cn('flex flex-wrap gap-1.5', className)}>{badges}</div>
}
