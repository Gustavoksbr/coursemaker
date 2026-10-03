import { Link } from 'react-router-dom'
import { Layers, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ContentBadges } from '@/components/ui/Badge'
import { MaybeLink } from '@/components/ui/MaybeLink'
import { SaveToLibraryButton } from '@/components/library/SaveToLibraryButton'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { trilhaHref } from '@/lib/contentLinks'
import { plural } from '@/lib/format'

export function TrilhaCard({ trilha }) {
  const href = trilhaHref(trilha)

  return (
    <article className="card group flex flex-col overflow-hidden">
      <MaybeLink to={href} className="block" tabIndex={-1} aria-hidden="true">
        <Thumbnail src={trilha.thumbnailUrl} alt={trilha.title} />
      </MaybeLink>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <ContentBadges
          status={trilha.status}
          visibility={trilha.visibility}
          featured={trilha.featured}
          blockedByAdmin={trilha.blockedByAdmin}
          school={trilha.school}
        />

        <div className="flex-1">
          <h3 className="line-clamp-2 break-words font-bold leading-snug text-slate-100 group-hover:text-brand-400">
            <MaybeLink to={href}>{trilha.title}</MaybeLink>
          </h3>
          {trilha.description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-slate-400">{trilha.description}</p>
          )}
        </div>

        {trilha.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {trilha.categories.slice(0, 3).map((category) => (
              <span key={category} className="badge max-w-full break-all bg-slate-700/60 text-slate-300">
                {category}
              </span>
            ))}
            {trilha.categories.length > 3 && (
              <span className="badge text-slate-500">+{trilha.categories.length - 3}</span>
            )}
          </div>
        )}

        <Link
          to={`/users/${trilha.owner.nickname}`}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200"
        >
          <Avatar src={trilha.owner.image} name={trilha.owner.name} size="sm" />
          <span className="truncate">{trilha.owner.name}</span>
        </Link>

        <div className="flex items-center justify-between border-t border-slate-700/70 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1" title={plural(trilha.itemCount, 'item', 'itens')}>
              <Layers size={13} /> {trilha.itemCount}
            </span>
            <span
              className="inline-flex items-center gap-1"
              title={plural(trilha.enrollmentCount, 'seguidor', 'seguidores')}
            >
              <Users size={13} /> {trilha.enrollmentCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {trilha.enrolledByMe && <span className="badge bg-brand-500/15 text-brand-300">Seguindo</span>}
            <SaveToLibraryButton kind="trilha" contentId={trilha.id} saved={trilha.savedByMe} size="sm" />
          </div>
        </div>
      </div>
    </article>
  )
}
