import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, UserMinus, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ContentBadges } from '@/components/ui/Badge'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { SaveToLibraryButton } from '@/components/library/SaveToLibraryButton'
import { CertificateButton } from '@/components/shared/CertificateButton'
import { FeatureToggleButton } from '@/components/shared/FeatureToggleButton'
import { BlockToggleButton } from '@/components/shared/BlockToggleButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { TrilhaItemsList } from '@/components/trilha/TrilhaItemsList'
import { CommentThread } from '@/components/comments/CommentThread'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import {
  completeTrilhaItem,
  enrollTrilha,
  getTrilhaBySlug,
  trilhaKeys,
  uncompleteTrilhaItem,
  unenrollTrilha,
} from '@/api/trilhas'
import { errorMessage } from '@/lib/api'
import { trilhaHref } from '@/lib/contentLinks'

export default function TrilhaViewPage() {
  const { nickname, slug } = useParams()
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  const trilhaQueryKey = trilhaKeys.bySlug(nickname, slug)
  const trilhaQuery = useQuery({
    queryKey: trilhaQueryKey,
    queryFn: () => getTrilhaBySlug(nickname, slug),
  })

  const detail = trilhaQuery.data
  const trilha = detail?.summary

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trilhaQueryKey })

  /**
   * Optimistically updates the item completion status in the cache without reloading the entire trilha.
   * Only invalidates on error to rollback the optimistic update.
   */
  const patchItemCompleted = (itemId, completed) => {
    queryClient.setQueryData(trilhaQueryKey, (current) => {
      if (!current) return current

      const patchItems = (items) =>
        items.map((item) => (item.id === itemId ? { ...item, manuallyCompleted: completed } : item))

      const updatedSteps = current.structure.steps.map((step) => ({
        ...step,
        items: patchItems(step.items),
      }))

      const updatedUngrouped = patchItems(current.structure.ungroupedItems)

      // Update progress counters
      const delta = completed ? 1 : -1
      const updatedProgress = current.progress
        ? {
          ...current.progress,
          completedItems: current.progress.completedItems + delta,
          percentage: Math.round(
            ((current.progress.completedItems + delta) / current.progress.totalItems) * 100,
          ),
        }
        : null

      return {
        ...current,
        structure: {
          steps: updatedSteps,
          ungroupedItems: updatedUngrouped,
        },
        progress: updatedProgress,
      }
    })
  }

  const { mutate: toggleFollow, isPending: following } = useMutation({
    mutationFn: () => (detail.enrolledByMe ? unenrollTrilha(trilha.id) : enrollTrilha(trilha.id)),
    onSuccess: () => {
      invalidate()
      toast.success(detail.enrolledByMe ? 'Voce deixou de seguir a trilha.' : 'Agora voce esta seguindo a trilha!')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar.')),
  })

  const { mutate: toggleComplete } = useMutation({
    mutationFn: (item) =>
      item.manuallyCompleted ? uncompleteTrilhaItem(item.id) : completeTrilhaItem(item.id),
    onMutate: async (item) => {
      // Optimistically update the UI immediately
      const newCompletedState = !item.manuallyCompleted
      patchItemCompleted(item.id, newCompletedState)
      return { itemId: item.id, previousState: item.manuallyCompleted }
    },
    onError: (error, item, context) => {
      // Rollback on error
      if (context) {
        patchItemCompleted(context.itemId, context.previousState)
      }
      toast.error(errorMessage(error, 'Nao foi possivel atualizar o progresso.'))
    },
    // No onSuccess - the optimistic update is enough!
  })

  if (trilhaQuery.isPending) return <PageLoader label="Carregando trilha..." />

  if (trilhaQuery.isError) {
    return (
      <ErrorState
        title="Trilha indisponivel"
        message={errorMessage(trilhaQuery.error, 'Esta trilha nao existe ou nao esta acessivel.')}
        onRetry={trilhaQuery.refetch}
      />
    )
  }

  const handleFollowClick = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    toggleFollow()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <header className="space-y-4">
        <ContentBadges
          status={trilha.status}
          visibility={trilha.visibility}
          featured={trilha.featured}
          school={trilha.school}
        />

        <h1 className="break-words text-3xl font-bold tracking-tight text-slate-100">{trilha.title}</h1>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            to={`/users/${trilha.owner.nickname}`}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-brand-400"
          >
            <Avatar src={trilha.owner.image} name={trilha.owner.name} />
            <span>
              <span className="block font-medium">{trilha.owner.name}</span>
              <span className="block text-xs text-slate-500">@{trilha.owner.nickname}</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <SaveToLibraryButton kind="trilha" contentId={trilha.id} saved={trilha.savedByMe} onChange={invalidate} />
            <FeatureToggleButton
              kind="trilha"
              contentId={trilha.id}
              featured={trilha.featured}
              onChanged={invalidate}
            />
            <BlockToggleButton
              kind="trilha"
              item={trilha}
              onSuccess={invalidate}
            />
            {detail.isOwner ? (
              <Link to={`${trilhaHref(trilha)}/edit`} className="btn-secondary">
                <Pencil size={16} /> Editar trilha
              </Link>
            ) : (
              <Button onClick={handleFollowClick} loading={following} variant={detail.enrolledByMe ? 'secondary' : 'primary'}>
                {detail.enrolledByMe ? (
                  <>
                    <UserMinus size={16} /> Deixar de seguir
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Seguir trilha
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Blocked warning for owner */}
        {detail.isOwner && trilha.blockedByAdmin && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-semibold text-red-400">Conteúdo bloqueado por administrador</h4>
                <p className="mt-1 text-sm text-slate-300">
                  Esta trilha foi bloqueada por um administrador e não está visível ao público. Entre em contato com a
                  equipe para mais informações.
                </p>
              </div>
              <Link
                to="/mensagens/admin"
                className="btn-secondary flex items-center gap-2 whitespace-nowrap text-sm"
              >
                <Mail size={16} />
                Falar com admin
              </Link>
            </div>
          </div>
        )}

        <Thumbnail src={trilha.thumbnailUrl} alt={trilha.title} className="rounded-xl" />

        {trilha.description && <p className="break-words text-lg text-slate-400">{trilha.description}</p>}
      </header>

      <div className="flex flex-wrap gap-6 rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-4 text-sm">
        <Stat label="Itens" value={trilha.itemCount} />
        <Stat label="Seguidores" value={trilha.enrollmentCount} />
        {trilha.categories?.length > 0 && (
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Categorias</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {trilha.categories.map((category) => (
                <span key={category} className="badge bg-slate-700/60 text-slate-300">
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {detail.progress && (
        <div className="space-y-3">
          <ProgressBar
            completed={detail.progress.completedItems}
            total={detail.progress.totalItems}
            percentage={detail.progress.percentage}
            unit={{ singular: 'item', plural: 'itens' }}
            ariaLabel="Progresso na trilha"
          />
          {detail.progress.percentage >= 100 && <CertificateButton kind="trilha" content={trilha} />}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-100">Sequencia</h2>
        <TrilhaItemsList
          structure={detail.structure}
          canTrackProgress={isAuthenticated}
          onToggleComplete={toggleComplete}
        />
      </section>

      <CommentThread kind="trilha" contentId={trilha.id} isOwner={detail.isOwner} />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-100">{value}</p>
    </div>
  )
}
