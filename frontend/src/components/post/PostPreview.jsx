import { useQuery } from '@tanstack/react-query'
import { ContentBadges } from '@/components/ui/Badge'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { BlockList } from '@/components/blocks/BlockRenderer'
import { PreviewOverlay } from '@/components/shared/PreviewOverlay'
import { listPostBlocks } from '@/api/posts'

/**
 * Owner-only preview of a post, built from the editor's local settings form (title/description/
 * visibility/...), which is only saved on the next "Salvar" click. Blocks are not part of that
 * draft - each one commits to the server as soon as it is saved in the block editor - so they are
 * simply fetched fresh, same as the published page would show.
 */
export function PostPreview({ post, postId, onClose }) {
  const { data: blocks, isPending } = useQuery({
    queryKey: ['posts', postId, 'preview-blocks'],
    queryFn: () => listPostBlocks(postId),
  })

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

        {isPending ? (
          <p className="text-sm text-slate-500">Carregando conteudo...</p>
        ) : (
          <BlockList blocks={blocks} emptyMessage="Este post ainda nao tem conteudo." />
        )}
      </article>
    </PreviewOverlay>
  )
}
