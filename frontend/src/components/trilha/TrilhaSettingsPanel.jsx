import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { CategoryInput } from '@/components/ui/CategoryInput'
import { ConfirmModal } from '@/components/ui/Modal'
import { ImageUploadField } from '@/components/blocks/ImageUploadField'
import { useToast } from '@/context/ToastContext'
import { deleteTrilha, trilhaKeys, updateTrilha } from '@/api/trilhas'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS, STATUS, VISIBILITY } from '@/lib/constants'

/** Everything about the trilha itself, mirroring CourseSettingsPanel. */
export function TrilhaSettingsPanel({ trilha, trilhaQueryKey, onDeleted }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState(() => ({
    title: trilha.title,
    description: trilha.description ?? '',
    thumbnailUrl: trilha.thumbnailUrl ?? '',
    visibility: trilha.visibility,
    categories: trilha.categories ?? [],
  }))

  useEffect(() => {
    setForm((current) => ({
      ...current,
      title: trilha.title,
      description: trilha.description ?? '',
      thumbnailUrl: trilha.thumbnailUrl ?? '',
      visibility: trilha.visibility,
      categories: trilha.categories ?? [],
    }))
  }, [trilha])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trilhaQueryKey })
    queryClient.invalidateQueries({ queryKey: trilhaKeys.all })
  }

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      updateTrilha(trilha.id, {
        title: form.title.trim(),
        description: form.description,
        thumbnailUrl: form.thumbnailUrl,
        visibility: form.visibility,
        categories: form.categories,
      }),
    onSuccess: () => {
      setErrors({})
      invalidate()
      toast.success('Configuracoes salvas.')
    },
    onError: (error) => {
      setErrors(fieldErrors(error))
      toast.error(errorMessage(error, 'Nao foi possivel salvar as configuracoes.'))
    },
  })

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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="trilha-settings-title" error={errors.title}>
          <Input
            id="trilha-settings-title"
            maxLength={LIMITS.NAME}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            invalid={Boolean(errors.title)}
          />
        </Field>

        <Field label="Visibilidade" htmlFor="trilha-settings-visibility" error={errors.visibility}>
          <Select
            id="trilha-settings-visibility"
            value={form.visibility}
            onChange={(event) => setForm({ ...form, visibility: event.target.value })}
          >
            <option value={VISIBILITY.PUBLIC}>Publica</option>
            <option value={VISIBILITY.PRIVATE}>Privada</option>
          </Select>
        </Field>
      </div>

      <Field label="Descricao" htmlFor="trilha-settings-description" error={errors.description}>
        <Textarea
          id="trilha-settings-description"
          rows={3}
          maxLength={LIMITS.DESCRIPTION}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Do que trata essa sequencia de cursos e posts?"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thumbnail" error={errors.thumbnailUrl} hint="Proporcao 16:9.">
          <ImageUploadField
            value={form.thumbnailUrl}
            onChange={(thumbnailUrl) => setForm({ ...form, thumbnailUrl })}
          />
        </Field>

        <Field label="Categorias">
          <CategoryInput value={form.categories} onChange={(categories) => setForm({ ...form, categories })} />
        </Field>
      </div>

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
        <Button loading={saving} onClick={() => save()}>
          <Save size={16} /> Salvar configuracoes
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
