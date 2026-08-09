import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, UserMinus, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ContentBadges } from '@/components/ui/Badge'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { TrilhaItemsList } from '@/components/trilha/TrilhaItemsList'
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
    onSuccess: invalidate,
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar o progresso.')),
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
        <ContentBadges status={trilha.status} visibility={trilha.visibility} featured={trilha.featured} />

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
            {detail.isOwner ? (
              <Link to={`/trilhas/${trilha.owner.nickname}/${trilha.slug}/edit`} className="btn-secondary">
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
        <ProgressBar
          completed={detail.progress.completedItems}
          total={detail.progress.totalItems}
          percentage={detail.progress.percentage}
        />
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-100">Sequencia</h2>
        <TrilhaItemsList
          structure={detail.structure}
          canTrackProgress={isAuthenticated}
          onToggleComplete={toggleComplete}
        />
      </section>
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
