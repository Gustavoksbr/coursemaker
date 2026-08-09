import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { TrilhaSettingsPanel } from '@/components/trilha/TrilhaSettingsPanel'
import { TrilhaStructureEditor } from '@/components/trilha/TrilhaStructureEditor'
import { ContentBadges } from '@/components/ui/Badge'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { getTrilhaBySlug, trilhaKeys } from '@/api/trilhas'
import { errorMessage } from '@/lib/api'

export default function TrilhaEditorPage() {
  const { nickname, slug } = useParams()
  const navigate = useNavigate()

  const trilhaQueryKey = trilhaKeys.bySlug(nickname, slug)
  const { data: detail, isPending, isError, error, refetch } = useQuery({
    queryKey: trilhaQueryKey,
    queryFn: () => getTrilhaBySlug(nickname, slug),
  })

  if (isPending) return <PageLoader label="Carregando editor..." />

  if (isError) {
    return (
      <ErrorState
        title="Nao foi possivel abrir o editor"
        message={errorMessage(error, 'Esta trilha nao existe ou nao esta acessivel.')}
        onRetry={refetch}
      />
    )
  }

  if (!detail.isOwner) {
    return <Navigate to={`/trilhas/${nickname}/${slug}`} replace />
  }

  const trilha = detail.summary

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-slate-100">{trilha.title}</h1>
          <p className="truncate text-xs text-slate-500">
            /trilhas/{trilha.owner.nickname}/{trilha.slug}
          </p>
        </div>

        <ContentBadges status={trilha.status} visibility={trilha.visibility} featured={trilha.featured} />

        <Link to={`/trilhas/${trilha.owner.nickname}/${trilha.slug}`} className="btn-secondary text-xs">
          <ExternalLink size={14} /> Ver publicada
        </Link>
      </header>

      <TrilhaSettingsPanel
        trilha={trilha}
        trilhaQueryKey={trilhaQueryKey}
        onDeleted={() => navigate('/trilhas')}
      />

      <TrilhaStructureEditor trilhaId={trilha.id} structure={detail.structure} trilhaQueryKey={trilhaQueryKey} />
    </div>
  )
}
