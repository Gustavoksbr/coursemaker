import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ContentBadges } from '@/components/ui/Badge'
import { SaveToLibraryButton } from '@/components/library/SaveToLibraryButton'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { BlockList } from '@/components/blocks/BlockRenderer'
import { RelatedItemsSection } from '@/components/related/RelatedItemsSection'
import { getPostBySlug, postKeys } from '@/api/posts'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'

export default function PostViewPage() {
  const { nickname, slug } = useParams()
  const queryClient = useQueryClient()

  const { data: detail, isPending, isError, error, refetch } = useQuery({
    queryKey: postKeys.bySlug(nickname, slug),
    queryFn: () => getPostBySlug(nickname, slug),
  })

  if (isPending) return <PageLoader label="Carregando post..." />

  if (isError) {
    return (
      <ErrorState
        title="Post indisponivel"
        message={errorMessage(error, 'Este post nao existe ou nao esta acessivel.')}
        onRetry={refetch}
      />
    )
  }

  const post = detail.summary
  const invalidate = () => queryClient.invalidateQueries({ queryKey: postKeys.bySlug(nickname, slug) })

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <header className="space-y-4">
        <ContentBadges status={post.status} visibility={post.visibility} featured={post.featured} />

        <h1 className="break-words text-3xl font-bold tracking-tight text-slate-100">{post.title}</h1>
        {post.description && <p className="break-words text-lg text-slate-400">{post.description}</p>}

        <div className="flex flex-wrap items-center gap-4">
          <Link
            to={`/users/${post.owner.nickname}`}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-brand-400"
          >
            <Avatar src={post.owner.image} name={post.owner.name} />
            <span>
              <span className="block font-medium">{post.owner.name}</span>
              <time dateTime={post.createdAt} className="block text-xs text-slate-500">
                {formatDate(post.createdAt)}
              </time>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <SaveToLibraryButton kind="post" contentId={post.id} saved={post.savedByMe} onChange={invalidate} />
            {detail.isOwner && (
              <Link to={`/posts/${post.id}/edit`} className="btn-secondary">
                <Pencil size={16} /> Editar
              </Link>
            )}
          </div>
        </div>

        {post.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.categories.map((category) => (
              <Link
                key={category}
                to={`/posts?category=${encodeURIComponent(category)}`}
                className="badge bg-slate-700/60 text-slate-300 hover:bg-slate-700"
              >
                {category}
              </Link>
            ))}
          </div>
        )}

        {post.thumbnailUrl && (
          <Thumbnail src={post.thumbnailUrl} alt={post.title} className="rounded-xl" />
        )}
      </header>

      <BlockList blocks={detail.blocks} emptyMessage="Este post ainda nao tem conteudo." />

      <RelatedItemsSection kind="post" contentId={post.id} />
    </article>
  )
}
