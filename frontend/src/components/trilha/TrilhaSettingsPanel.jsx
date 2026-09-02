import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { CategoryInput } from '@/components/ui/CategoryInput'
import { AreaSelect } from '@/components/ui/AreaSelect'
import { SchoolSelect } from '@/components/ui/SchoolSelect'
import { ConfirmModal } from '@/components/ui/Modal'
import { ImageUploadField } from '@/components/blocks/ImageUploadField'
import { useToast } from '@/context/ToastContext'
import { deleteTrilha, trilhaKeys, updateTrilha } from '@/api/trilhas'
import { errorMessage } from '@/lib/api'
import { LIMITS, STATUS } from '@/lib/constants'

/**
 * Everything about the trilha itself, mirroring CourseSettingsPanel. `draft` (from
 * `useTrilhaSettingsDraft`) owns the form values and dirty/save state: this panel is a controlled
 * view over it, so the page's single "Salvar estrutura" button covers settings too.
 */
export function TrilhaSettingsPanel({ trilha, draft, trilhaQueryKey, onDeleted }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { form, errors, setField } = draft

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trilhaQueryKey })
    queryClient.invalidateQueries({ queryKey: trilhaKeys.all })
  }

  const { mutate: toggleStatus, isPending: togglingStatus } = useMutation({
    mutationFn: () =>
      updateTrilha(trilha.id, {
        status: trilha.status === STATUS.AVAILABLE ? STATUS.UNAVAILABLE : STATUS.AVAILABLE,
      }),
    onSuccess: (updated) => {
      invalidate()
      toast.success(updated.status === STATUS.AVAILABLE ? 'Trilha publicada.' : 'Trilha voltou para rascunho.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel alterar o status.')),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => deleteTrilha(trilha.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trilhaKeys.all })
      toast.success('Trilha excluida.')
      onDeleted()
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel excluir a trilha.')),
  })

  const published = trilha.status === STATUS.AVAILABLE

  return (
    <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <Field label="Nome" htmlFor="trilha-settings-title" error={errors.title}>
        <Input
          id="trilha-settings-title"
          maxLength={LIMITS.NAME}
          value={form.title}
          onChange={(event) => setField({ title: event.target.value })}
          invalid={Boolean(errors.title)}
        />
      </Field>

      <Field label="Descricao" htmlFor="trilha-settings-description" error={errors.description}>
        <Textarea
          id="trilha-settings-description"
          rows={3}
          maxLength={LIMITS.DESCRIPTION}
          value={form.description}
          onChange={(event) => setField({ description: event.target.value })}
          placeholder="Do que trata essa sequencia de cursos e posts?"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thumbnail" error={errors.thumbnailUrl} hint="Proporcao 16:9.">
          <ImageUploadField
            value={form.thumbnailUrl}
            onChange={(thumbnailUrl) => setField({ thumbnailUrl })}
          />
        </Field>

        <Field label="Categorias">
          <CategoryInput value={form.categories} onChange={(categories) => setField({ categories })} />
        </Field>
      </div>

      <Field label="Area" htmlFor="trilha-settings-area" error={errors.areaId}>
        <AreaSelect
          id="trilha-settings-area"
          value={form.areaId}
          onChange={(areaId) => setField({ areaId })}
        />
      </Field>

      <SchoolSelect
        id="trilha-settings-school"
        value={form.schoolId}
        onChange={(schoolId) => setField({ schoolId })}
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-700 pt-4">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="btn-danger mr-auto text-sm"
        >
          <Trash2 size={15} /> Excluir trilha
        </button>

        <Button variant="secondary" loading={togglingStatus} onClick={() => toggleStatus()}>
          {published ? (
            <>
              <EyeOff size={16} /> Voltar para rascunho
            </>
          ) : (
            <>
              <Eye size={16} /> Publicar trilha
            </>
          )}
        </Button>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove()}
        loading={deleting}
        title="Excluir trilha"
        message="Os itens, seguidores e conclusoes desta trilha serao excluidos junto. Esta acao nao pode ser desfeita."
        confirmLabel="Excluir definitivamente"
      />
    </section>
  )
}
