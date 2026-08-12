import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye, Save } from 'lucide-react'
import { TrilhaPreview } from '@/components/trilha/TrilhaPreview'
import { TrilhaSettingsPanel } from '@/components/trilha/TrilhaSettingsPanel'
import { TrilhaStructureEditor } from '@/components/trilha/TrilhaStructureEditor'
import { Button } from '@/components/ui/Button'
import { ContentBadges } from '@/components/ui/Badge'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { UnsavedChangesPrompt } from '@/components/ui/UnsavedChangesPrompt'
import { useTrilhaStructureDraft } from '@/hooks/useTrilhaStructureDraft'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { useToast } from '@/context/ToastContext'
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

  return (
    <TrilhaEditorContent detail={detail} trilhaQueryKey={trilhaQueryKey} onDeleted={() => navigate('/trilhas')} />
  )
}

/**
 * Split out so `useTrilhaStructureDraft` only mounts once `detail` is loaded - see the identical
 * split in `CourseEditorPage.jsx` for why (a reducer's lazy init only ever runs once).
 */
function TrilhaEditorContent({ detail, trilhaQueryKey, onDeleted }) {
  const toast = useToast()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState(null)
  const trilha = detail.summary
  const structureDraft = useTrilhaStructureDraft(trilha.id, detail.structure)
  const blocker = useUnsavedChangesGuard(structureDraft.isDirty)

  const handleSave = async () => {
    try {
      await structureDraft.flush()
      toast.success('Estrutura da trilha salva.')
    } catch (error) {
      const label = error.draftStepLabel
      toast.error(errorMessage(error, label ? `Nao foi possivel salvar ${label}.` : 'Nao foi possivel salvar a estrutura.'))
    }
  }

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

        {structureDraft.isDirty && (
          <Button onClick={handleSave} loading={structureDraft.isFlushing}>
            <Save size={16} /> Salvar estrutura
          </Button>
        )}

        <button type="button" onClick={() => setPreviewOpen(true)} className="btn-secondary text-xs">
          <Eye size={14} /> Pre-visualizar
        </button>
      </header>

      <TrilhaSettingsPanel
        trilha={trilha}
        trilhaQueryKey={trilhaQueryKey}
        onDeleted={onDeleted}
        onDraftChange={setSettingsDraft}
      />

      <TrilhaStructureEditor draft={structureDraft} />
      <UnsavedChangesPrompt blocker={blocker} />

      {previewOpen && (
        <TrilhaPreview
          trilha={{
            ...trilha,
            title: settingsDraft?.title ?? trilha.title,
            description: settingsDraft?.description ?? trilha.description,
            thumbnailUrl: settingsDraft?.thumbnailUrl ?? trilha.thumbnailUrl,
            categories: settingsDraft?.categories ?? trilha.categories,
          }}
          structureDraft={structureDraft}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  )
}
