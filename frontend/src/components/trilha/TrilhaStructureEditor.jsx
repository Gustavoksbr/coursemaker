import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, GripVertical, MessageSquarePlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { PickContentModal } from '@/components/shared/PickContentModal'
import { useDragReorder } from '@/hooks/useDragReorder'
import { useToast } from '@/context/ToastContext'
import {
  addTrilhaItem,
  createTrilhaStep,
  deleteTrilhaStep,
  moveTrilhaItem,
  removeTrilhaItem,
  reorderTrilhaSteps,
  updateTrilhaItem,
  updateTrilhaStep,
} from '@/api/trilhas'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Editor for the trilha's structure: optional steps (Alura-style "1 - Fundamentos" groupings),
 * each holding an ordered list of items, plus whatever the owner leaves ungrouped. Steps reorder
 * as a block (drag-and-drop, same mechanics as CurriculumEditor's modules); items reorder within
 * their own group and can be moved to another group via a select, mirroring how a lesson can only
 * be dragged within its module but still needs an escape hatch to change module.
 */
export function TrilhaStructureEditor({ trilhaId, structure, trilhaQueryKey }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editingStep, setEditingStep] = useState(null)
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerStepId, setPickerStepId] = useState(null)

  const steps = structure.steps
  const ungroupedItems = structure.ungroupedItems

  const refresh = () => queryClient.invalidateQueries({ queryKey: trilhaQueryKey })
  const onError = (fallback) => (error) => toast.error(errorMessage(error, fallback))

  const allItems = [...ungroupedItems, ...steps.flatMap((step) => step.items)]
  const excludeCourseIds = allItems.filter((item) => item.course).map((item) => item.course.id)
  const excludePostIds = allItems.filter((item) => item.post).map((item) => item.post.id)

  const { mutate: addStep, isPending: addingStep } = useMutation({
    mutationFn: () => createTrilhaStep(trilhaId, { title: 'Nova etapa' }),
    onSuccess: (created) => {
      refresh()
      setEditingStep({ id: created.id, title: created.title, description: created.description ?? '' })
    },
    onError: onError('Nao foi possivel criar a etapa.'),
  })

  const { mutate: saveStep } = useMutation({
    mutationFn: ({ id, title, description }) => updateTrilhaStep(trilhaId, id, { title, description }),
    onSuccess: () => {
      setEditingStep(null)
      refresh()
    },
    onError: onError('Nao foi possivel salvar a etapa.'),
  })

  const { mutate: removeStep } = useMutation({
    mutationFn: (id) => deleteTrilhaStep(trilhaId, id),
    onSuccess: () => {
      setConfirmDeleteStep(null)
      refresh()
    },
    onError: onError('Nao foi possivel excluir a etapa.'),
  })

  const { mutate: moveSteps } = useMutation({
    mutationFn: (ids) => reorderTrilhaSteps(trilhaId, ids),
    onSuccess: refresh,
    onError: onError('Nao foi possivel reordenar as etapas.'),
  })

  const stepsDrag = useDragReorder(steps, moveSteps)

  const { mutate: addItem } = useMutation({
    mutationFn: ({ type, item, stepId }) =>
      addTrilhaItem(trilhaId, { [type === 'course' ? 'courseId' : 'postId']: item.id, stepId }),
    onSuccess: () => {
      setPickerOpen(false)
      refresh()
    },
    onError: onError('Nao foi possivel adicionar o item.'),
  })

  const openPicker = (stepId) => {
    setPickerStepId(stepId)
    setPickerOpen(true)
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Sequencia da trilha</h2>
        <button type="button" onClick={() => addStep()} disabled={addingStep} className="btn-ghost px-2 py-1 text-xs">
          <Plus size={14} /> Etapa
        </button>
      </div>

      {steps.length === 0 && ungroupedItems.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
          Crie etapas para organizar a trilha (ex.: "1 - Fundamentos"), ou adicione itens direto.
        </p>
      )}

      {ungroupedItems.length > 0 && (
        <ItemGroup
          title="Sem etapa"
          items={ungroupedItems}
          steps={steps}
          trilhaId={trilhaId}
          refresh={refresh}
          onAddClick={() => openPicker(null)}
        />
      )}

      <ul className="space-y-3">
        {steps.map((step) => (
          <li
            key={step.id}
            {...stepsDrag.getItemProps(step.id)}
            className={cn(
              'rounded-lg border border-slate-700',
              stepsDrag.draggingId === step.id && 'opacity-40',
              stepsDrag.overId === step.id && stepsDrag.draggingId !== step.id && 'border-brand-500',
            )}
          >
            <div className="flex items-center gap-2 border-b border-slate-700/60 bg-slate-900/40 px-3 py-2">
              <GripVertical size={14} className="shrink-0 cursor-grab text-slate-600 active:cursor-grabbing" />
              {editingStep?.id === step.id ? (
                <StepEditForm
                  value={editingStep}
                  onChange={setEditingStep}
                  onSave={() => saveStep(editingStep)}
                  onCancel={() => setEditingStep(null)}
                />
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-200">{step.title}</p>
                    {step.description && <p className="truncate text-xs text-slate-500">{step.description}</p>}
                  </div>
                  <IconButton
                    icon={Pencil}
                    label="Editar etapa"
                    onClick={() => setEditingStep({ id: step.id, title: step.title, description: step.description ?? '' })}
                  />
                  <IconButton icon={Trash2} label="Excluir etapa" danger onClick={() => setConfirmDeleteStep(step)} />
                </>
              )}
            </div>
            <div className="p-3">
              <ItemGroup
                items={step.items}
                steps={steps}
                trilhaId={trilhaId}
                refresh={refresh}
                onAddClick={() => openPicker(step.id)}
              />
            </div>
          </li>
        ))}
      </ul>

      <PickContentModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(type, item) => addItem({ type, item, stepId: pickerStepId })}
        excludeCourseIds={excludeCourseIds}
        excludePostIds={excludePostIds}
        title="Adicionar a trilha"
      />

      <ConfirmModal
        open={Boolean(confirmDeleteStep)}
        onClose={() => setConfirmDeleteStep(null)}
        onConfirm={() => removeStep(confirmDeleteStep.id)}
        title="Excluir etapa"
        message="Os itens desta etapa saem da trilha junto. Os cursos/posts em si nao sao afetados."
        confirmLabel="Excluir etapa"
      />
    </section>
  )
}

/** One group of items (a step, or the ungrouped bucket): reorder, move-between-groups, notes. */
function ItemGroup({ title, items, steps, trilhaId, refresh, onAddClick }) {
  const toast = useToast()
  const [editingNote, setEditingNote] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)

  const onError = (fallback) => (error) => toast.error(errorMessage(error, fallback))

  const { mutate: moveItems } = useMutation({
    mutationFn: async (ids) => {
      const changes = ids
        .map((id, index) => ({ id, index }))
        .filter(({ id, index }) => items.find((item) => item.id === id)?.orderIndex !== index)
      await Promise.all(changes.map(({ id, index }) => updateTrilhaItem(trilhaId, id, { orderIndex: index })))
    },
    onSuccess: refresh,
    onError: onError('Nao foi possivel reordenar os itens.'),
  })
  const drag = useDragReorder(items, moveItems)

  const { mutate: saveNote } = useMutation({
    mutationFn: ({ id, note }) => updateTrilhaItem(trilhaId, id, { note }),
    onSuccess: () => {
      setEditingNote(null)
      refresh()
    },
    onError: onError('Nao foi possivel salvar a nota.'),
  })

  const { mutate: moveItem } = useMutation({
    mutationFn: ({ id, targetStepId }) => moveTrilhaItem(trilhaId, id, targetStepId),
    onSuccess: refresh,
    onError: onError('Nao foi possivel mover o item.'),
  })

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (id) => removeTrilhaItem(trilhaId, id),
    onSuccess: () => {
      setConfirmRemove(null)
      refresh()
    },
    onError: onError('Nao foi possivel remover o item.'),
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {title ? (
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        ) : (
          <span />
        )}
        <button type="button" onClick={onAddClick} className="text-xs font-medium text-brand-400 hover:text-brand-300">
          <Plus size={12} className="inline" /> Adicionar item
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-center text-xs text-slate-500">
          Nenhum item aqui ainda.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const content = item.course ?? item.post
            const href = item.course
              ? `/courses/${content.owner.nickname}/${content.slug}`
              : `/posts/${content.owner.nickname}/${content.slug}`
            const isEditingNote = editingNote?.itemId === item.id

            return (
              <li
                key={item.id}
                {...drag.getItemProps(item.id)}
                className={cn(
                  'rounded-lg border border-transparent',
                  drag.draggingId === item.id && 'opacity-40',
                  drag.overId === item.id && drag.draggingId !== item.id && 'border-brand-500',
                )}
              >
                <div className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-800">
                  <GripVertical size={13} className="shrink-0 cursor-grab text-slate-600 active:cursor-grabbing" />
                  <Thumbnail
                    src={content.thumbnailUrl}
                    alt={content.name ?? content.title}
                    className="h-9 w-14 shrink-0 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm font-medium text-slate-200 hover:text-brand-400"
                    >
                      {content.name ?? content.title}
                    </a>
                    <span className="text-xs text-slate-500">{item.course ? 'Curso' : 'Post'}</span>
                  </div>
                  {steps.length > 0 && (
                    <select
                      value={item.stepId ?? ''}
                      onChange={(event) => moveItem({ id: item.id, targetStepId: event.target.value || null })}
                      className="input w-32 shrink-0 py-1 text-xs"
                      aria-label="Mover para etapa"
                    >
                      <option value="">Sem etapa</option>
                      {steps.map((step) => (
                        <option key={step.id} value={step.id}>
                          {step.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <IconButton
                    icon={MessageSquarePlus}
                    label="Adicionar nota"
                    onClick={() => setEditingNote({ itemId: item.id, value: item.note ?? '' })}
                  />
                  <IconButton icon={Trash2} label="Remover da trilha" danger onClick={() => setConfirmRemove(item)} />
                </div>

                {isEditingNote && (
                  <div className="flex items-start gap-1.5 px-2 pb-2">
                    <textarea
                      autoFocus
                      rows={2}
                      value={editingNote.value}
                      onChange={(event) => setEditingNote({ ...editingNote, value: event.target.value })}
                      placeholder="Seu comentario sobre este item, visivel para quem ve a trilha..."
                      className="input flex-1 text-xs"
                    />
                    <IconButton icon={Check} label="Salvar nota" onClick={() => saveNote({ id: item.id, note: editingNote.value })} />
                    <IconButton icon={X} label="Cancelar" onClick={() => setEditingNote(null)} />
                  </div>
                )}
                {!isEditingNote && item.note && (
                  <p className="mx-2 mb-2 whitespace-pre-wrap rounded bg-slate-900/60 px-2 py-1.5 text-xs text-slate-400">
                    {item.note}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmModal
        open={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => remove(confirmRemove.id)}
        loading={removing}
        title="Remover da trilha"
        message="Este item deixara de fazer parte da trilha. O curso ou post em si nao e afetado."
        confirmLabel="Remover"
      />
    </div>
  )
}

function StepEditForm({ value, onChange, onSave, onCancel }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
      <input
        autoFocus
        value={value.title}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSave()
          if (event.key === 'Escape') onCancel()
        }}
        placeholder="Titulo da etapa"
        aria-label="Titulo da etapa"
        className="rounded border border-brand-500 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:outline-none"
      />
      <div className="flex items-center gap-1.5">
        <input
          value={value.description}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
          placeholder="Descricao (opcional)"
          aria-label="Descricao da etapa"
          className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 focus:outline-none"
        />
        <IconButton icon={Check} label="Salvar" onClick={onSave} disabled={!value.title.trim()} />
        <IconButton icon={X} label="Cancelar" onClick={onCancel} />
      </div>
    </div>
  )
}

function IconButton({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'shrink-0 rounded p-1 text-slate-500 transition-colors disabled:opacity-40',
        danger ? 'hover:bg-slate-700 hover:text-red-400' : 'hover:bg-slate-700 hover:text-slate-200',
      )}
    >
      <Icon size={13} />
    </button>
  )
}
