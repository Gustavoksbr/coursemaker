import { useState } from 'react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

const SIZES = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
}

/** Profile picture, falling back to initials when there is no image or it fails to load. */
export function Avatar({ src, name, size = 'md', className }) {
  const [broken, setBroken] = useState(false)
  const showImage = src && !broken

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-semibold text-slate-200',
        SIZES[size],
        className,
      )}
      title={name || undefined}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ? `Foto de ${name}` : ''}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}
