import { ContentBadges } from '@/components/ui/Badge'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { BlockList } from '@/components/blocks/BlockRenderer'
import { PreviewOverlay } from '@/components/shared/PreviewOverlay'

/**
 * Owner-only preview of a post, built entirely from the editor's local drafts (settings form and
 * block draft), none of which may have been saved yet - so what you see really is what "Salvar
 * alteracoes" would publish.
 */
export function PostPreview({ post, blocks, onClose }) {
  return (
    <PreviewOverlay onClose={onClose}>
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <header className="space-y-4">
          <ContentBadges status={post.status} visibility={post.visibility} featured={post.featured} />

          <h1 className="break-words text-3xl font-bold tracking-tight text-slate-100">{post.title}</h1>
          {post.description && <p className="break-words text-lg text-slate-400">{post.description}</p>}

          {post.categories?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.categories.map((category) => (
                <span key={category} className="badge bg-slate-700/60 text-slate-300">
                  {category}
                </span>
              ))}
            </div>
          )}

          {post.thumbnailUrl && <Thumbnail src={post.thumbnailUrl} alt={post.title} className="rounded-xl" />}
        </header>

        <BlockList blocks={blocks} emptyMessage="Este post ainda nao tem conteudo." />
      </article>
    </PreviewOverlay>
  )
}
