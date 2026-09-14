import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { CategoryInput } from '@/components/ui/CategoryInput'
import { AreaSelect } from '@/components/ui/AreaSelect'
import { SchoolSelect } from '@/components/ui/SchoolSelect'
import { ConfirmModal } from '@/components/ui/Modal'
import { ImageUploadField } from '@/components/blocks/ImageUploadField'
import { useToast } from '@/context/ToastContext'
import { courseKeys, deleteCourse, updateCourse } from '@/api/courses'
import { errorMessage } from '@/lib/api'
import { LIMITS, STATUS, VISIBILITY } from '@/lib/constants'

/**
 * Everything about the course itself - a full-width card above the curriculum, mirroring how
 * PostEditorPage lays out its own settings section above the block editor.
 *
 * `draft` (from `useCourseSettingsDraft`) owns the form values and dirty/save state: this panel is
 * a controlled view over it, so the page's single "Salvar alteracoes" button covers settings too,
 * instead of settings having their own separate save button.
 */
export function CourseSettingsPanel({ course, draft, courseQueryKey, onDeleted, onOpenStudents }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Collapsed by default: these fields are set once and rarely touched again, unlike the lessons below.
  const [expanded, setExpanded] = useState(false)

  const { form, errors, setField } = draft

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: courseQueryKey })
    queryClient.invalidateQueries({ queryKey: courseKeys.all })
  }

  const { mutate: toggleStatus, isPending: togglingStatus } = useMutation({
    mutationFn: () =>
      updateCourse(course.id, {
        status: course.status === STATUS.AVAILABLE ? STATUS.UNAVAILABLE : STATUS.AVAILABLE,
      }),
    onSuccess: (updated) => {
      invalidate()
      toast.success(
        updated.status === STATUS.AVAILABLE
          ? 'Curso publicado.'
          : 'Curso voltou para rascunho.',
      )
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel alterar o status.')),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => deleteCourse(course.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all })
      toast.success('Curso excluido.')
      onDeleted()
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel excluir o curso.')),
  })

  const published = course.status === STATUS.AVAILABLE
  const needsPassword = form.visibility === VISIBILITY.PRIVATE

  return (
    <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <div>
          <h2 className="font-semibold text-slate-100">Configuracoes do curso</h2>
          <p className="text-sm text-slate-500">
            {expanded ? 'Nome, visibilidade, descricao, thumbnail e categorias.' : course.name}
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronDown size={18} className="shrink-0 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nome"
              htmlFor="settings-name"
              error={errors.name}
              value={form.name}
              maxLength={LIMITS.NAME}
            >
              <Input
                id="settings-name"
                maxLength={LIMITS.NAME}
                value={form.name}
                onChange={(event) => setField({ name: event.target.value })}
                invalid={Boolean(errors.name)}
              />
            </Field>

            <Field label="Visibilidade" htmlFor="settings-visibility" error={errors.visibility}>
              <Select
                id="settings-visibility"
                value={form.visibility}
                onChange={(event) => setField({ visibility: event.target.value })}
              >
                <option value={VISIBILITY.PUBLIC}>Publico</option>
                <option value={VISIBILITY.PRIVATE}>Privado (senha)</option>
              </Select>
            </Field>
          </div>

          {needsPassword && (
            <Field
              label={course.visibility === VISIBILITY.PRIVATE ? 'Trocar senha' : 'Senha de acesso'}
              htmlFor="settings-password"
              error={errors.password}
              hint={
                course.visibility === VISIBILITY.PRIVATE
                  ? 'Deixe em branco para manter a senha atual.'
                  : 'Obrigatoria ao tornar o curso privado.'
              }
            >
              <Input
                id="settings-password"
                type="password"
                maxLength={LIMITS.PASSWORD}
                value={form.password}
                onChange={(event) => setField({ password: event.target.value })}
                placeholder="••••••••"
              />
            </Field>
          )}

          <Field
            label="Descricao curta"
            htmlFor="settings-description"
            error={errors.description}
            value={form.description}
            maxLength={LIMITS.DESCRIPTION}
          >
            <Textarea
              id="settings-description"
              rows={2}
              maxLength={LIMITS.DESCRIPTION}
              value={form.description}
              onChange={(event) => setField({ description: event.target.value })}
              placeholder="Aparece nos cards do catalogo."
            />
          </Field>

          <Field
            label="Descricao da landing page"
            htmlFor="settings-landing"
            error={errors.landingDescription}
            hint="Texto completo mostrado na pagina do curso."
            value={form.landingDescription}
            maxLength={LIMITS.LANDING_DESCRIPTION}
          >
            <Textarea
              id="settings-landing"
              rows={4}
              maxLength={LIMITS.LANDING_DESCRIPTION}
              value={form.landingDescription}
              onChange={(event) => setField({ landingDescription: event.target.value })}
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
              <CategoryInput
                value={form.categories}
                onChange={(categories) => setField({ categories })}
              />
            </Field>
          </div>

          <Field label="Area" htmlFor="settings-area" error={errors.areaId}>
            <AreaSelect
              id="settings-area"
              value={form.areaId}
              onChange={(areaId) => setField({ areaId })}
            />
          </Field>

          <SchoolSelect
            id="settings-school"
            value={form.schoolId}
            onChange={(schoolId) => setField({ schoolId })}
          />

          <Checkbox
            label="Acompanhamento de progresso"
            description="Alunos podem marcar licoes como concluidas."
            checked={form.progressEnabled}
            onChange={(event) => setField({ progressEnabled: event.target.checked })}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-700 pt-4">
        <div className="mr-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenStudents}
            className="btn-ghost border border-slate-700 text-sm"
          >
            <Users size={15} /> Alunos matriculados
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn-danger text-sm"
          >
            <Trash2 size={15} /> Excluir curso
          </button>
        </div>

        <Button variant="secondary" loading={togglingStatus} onClick={() => toggleStatus()}>
          {published ? (
            <>
              <EyeOff size={16} /> Voltar para rascunho
            </>
          ) : (
            <>
              <Eye size={16} /> Publicar curso
            </>
          )}
        </Button>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove()}
        loading={deleting}
        title="Excluir curso"
        message="Modulos, licoes, blocos, matriculas e comentarios serao excluidos junto. Esta acao nao pode ser desfeita."
        confirmLabel="Excluir definitivamente"
      />
    </section>
  )
}
