import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Pencil } from 'lucide-react'
import { ChatWidget } from '@/components/ai/ChatWidget'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ContentBadges } from '@/components/ui/Badge'
import { SaveToLibraryButton } from '@/components/library/SaveToLibraryButton'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { BlockList } from '@/components/blocks/BlockRenderer'
import { CommentThread } from '@/components/comments/CommentThread'
import { PrivatePasswordModal } from '@/components/shared/PrivatePasswordModal'
import { FeatureToggleButton } from '@/components/shared/FeatureToggleButton'
import { RelatedItemsSection } from '@/components/related/RelatedItemsSection'
import { useToast } from '@/context/ToastContext'
import { getPostBySlug, postKeys } from '@/api/posts'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'

export default function PostViewPage() {
  const { nickname, slug } = useParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [passwordOpen, setPasswordOpen] = useState(false)

  const { data: detail, isPending, isError, error, refetch } = useQuery({
    queryKey: postKeys.bySlug(nickname, slug),
    queryFn: () => getPostBySlug(nickname, slug),
  })

  // Ask for the password as soon as we learn the post is locked.
  useEffect(() => {
    if (detail?.requiresPassword) setPasswordOpen(true)
  }, [detail?.requiresPassword])

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
    <>
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <header className="space-y-4">
          <ContentBadges
            status={post.status}
            visibility={post.visibility}
            featured={post.featured}
            school={post.school}
          />

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
              <FeatureToggleButton kind="post" contentId={post.id} featured={post.featured} onChanged={invalidate} />
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
                  to={`/pesquisar?tab=posts&category=${encodeURIComponent(category)}`}
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

        {detail.requiresPassword ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 px-6 py-10 text-center">
            <Lock className="text-violet-400" size={28} />
            <div>
              <p className="font-semibold text-slate-200">Conteudo protegido por senha</p>
              <p className="mt-1 text-sm text-slate-400">Informe a senha do post para ver o conteudo.</p>
            </div>
            <Button onClick={() => setPasswordOpen(true)}>Informar senha</Button>
          </div>
        ) : (
          <BlockList blocks={detail.blocks} emptyMessage="Este post ainda nao tem conteudo." />
        )}

        <RelatedItemsSection kind="post" contentId={post.id} />

        {!detail.requiresPassword && (
          <CommentThread kind="post" contentId={post.id} isOwner={detail.isOwner} />
        )}
      </article>

      <ChatWidget kind="post" contentId={post.id} />

      <PrivatePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        kind="post"
        contentId={post.id}
        contentName={post.title}
        onUnlocked={() => {
          setPasswordOpen(false)
          toast.success('Acesso liberado!')
          invalidate()
        }}
      />
    </>
  )
}
