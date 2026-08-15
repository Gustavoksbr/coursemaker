import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Save, X } from 'lucide-react'
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState(null)
  const trilha = detail.summary
  const structureDraft = useTrilhaStructureDraft(trilha.id, detail.structure)
  const blocker = useUnsavedChangesGuard(structureDraft.isDirty)

  const handleSave = async () => {
    try {
      await structureDraft.flush()
      // The public trilha page (and this editor's own initial load) share this exact query key -
      // without invalidating it here, navigating to the trilha page right after saving would show
      // whatever was cached from before this save, not what was just published.
      queryClient.invalidateQueries({ queryKey: trilhaQueryKey })
      toast.success('Estrutura da trilha salva.')
    } catch (error) {
      const label = error.draftStepLabel
      toast.error(errorMessage(error, label ? `Nao foi possivel salvar ${label}.` : 'Nao foi possivel salvar a estrutura.'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:px-6">
      <header className="sticky top-16 z-30 -mx-4 flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-slate-100">{trilha.title}</h1>
          <p className="truncate text-xs text-slate-500">
            /trilhas/{trilha.owner.nickname}/{trilha.slug}
          </p>
        </div>

        <ContentBadges status={trilha.status} visibility={trilha.visibility} featured={trilha.featured} />

        <Button
          onClick={handleSave}
          disabled={!structureDraft.isDirty}
          loading={structureDraft.isFlushing}
          title={structureDraft.isDirty ? undefined : 'Faca uma alteracao para poder salvar'}
        >
          <Save size={16} /> Salvar estrutura
        </Button>

        <button type="button" onClick={() => setPreviewOpen(true)} className="btn-secondary text-xs">
          <Eye size={14} /> Pre-visualizar
        </button>

        {/* Navigating away while dirty is already intercepted by useUnsavedChangesGuard's blocker
            below, which shows the confirm prompt. */}
        <button
          type="button"
          onClick={() => navigate(`/trilhas/${trilha.owner.nickname}/${trilha.slug}`)}
          className="btn-ghost text-xs"
        >
          <X size={14} /> Cancelar alteracoes
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
