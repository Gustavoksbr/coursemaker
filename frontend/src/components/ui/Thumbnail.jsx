import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/** 16:9 cover image with a neutral placeholder when there is none (or it fails to load). */
export function Thumbnail({ src, alt, className }) {
  const [broken, setBroken] = useState(false)

  return (
    <div className={cn('relative aspect-video overflow-hidden bg-slate-900', className)}>
      {src && !broken ? (
        <img
          src={src}
          alt={alt || ''}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-800 to-slate-900">
          <ImageIcon className="text-slate-700" size={32} />
        </div>
      )}
    </div>
  )
}
