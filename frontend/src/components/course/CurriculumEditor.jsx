import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { useDragReorder } from '@/hooks/useDragReorder'
import { useToast } from '@/context/ToastContext'
import {
  courseKeys,
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  reorderLessons,
  reorderModules,
  updateLesson,
  updateModule,
} from '@/api/courses'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * The middle column of the course editor: modules and lessons, with inline renaming, drag-and-drop
 * reordering (lessons reorder within their own module) and lesson selection.
 */
export function CurriculumEditor({ courseId, modules, activeLessonId, onSelectLesson, courseQueryKey }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: courseQueryKey })
    queryClient.invalidateQueries({ queryKey: courseKeys.all })
  }

  const onError = (fallback) => (error) => toast.error(errorMessage(error, fallback))

  const { mutate: addModule, isPending: addingModule } = useMutation({
    mutationFn: () => createModule(courseId, { title: 'Novo modulo' }),
    onSuccess: (created) => {
      refresh()
      setEditing({ kind: 'module', id: created.id, value: created.title })
    },
    onError: onError('Nao foi possivel criar o modulo.'),
  })

  const { mutate: addLesson } = useMutation({
    mutationFn: (moduleId) => createLesson(moduleId, { title: 'Nova licao' }),
    onSuccess: (created) => {
      refresh()
      onSelectLesson(created.id)
      setEditing({ kind: 'lesson', id: created.id, value: created.title })
    },
    onError: onError('Nao foi possivel criar a licao.'),
  })

  const { mutate: renameModule } = useMutation({
    mutationFn: ({ id, title }) => updateModule(id, { title }),
    onSuccess: () => {
      setEditing(null)
      refresh()
    },
    onError: onError('Nao foi possivel renomear o modulo.'),
  })

  const { mutate: renameLesson } = useMutation({
    mutationFn: ({ id, title }) => updateLesson(id, { title }),
    onSuccess: () => {
      setEditing(null)
      refresh()
    },
    onError: onError('Nao foi possivel renomear a licao.'),
  })

  const { mutate: removeModule } = useMutation({
    mutationFn: (id) => deleteModule(id),
    onSuccess: () => {
      setConfirm(null)
      refresh()
    },
    onError: onError('Nao foi possivel excluir o modulo.'),
  })

  const { mutate: removeLesson } = useMutation({
    mutationFn: (id) => deleteLesson(id),
    onSuccess: (_data, id) => {
      setConfirm(null)
      if (id === activeLessonId) onSelectLesson(null)
      refresh()
    },
    onError: onError('Nao foi possivel excluir a licao.'),
  })

  const { mutate: moveModules } = useMutation({
    mutationFn: (ids) => reorderModules(courseId, ids),
    onSuccess: refresh,
    onError: onError('Nao foi possivel reordenar os modulos.'),
  })

  const moduleDrag = useDragReorder(modules, moveModules)

  const toggleCollapse = (moduleId) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Curriculo</h2>
        <button
          type="button"
          onClick={() => addModule()}
          disabled={addingModule}
          className="btn-ghost px-2 py-1 text-xs"
        >
          <Plus size={14} /> Modulo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {modules.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-slate-500">
            Comece adicionando um modulo.
          </p>
        ) : (
          <ul className="space-y-1">
            {modules.map((module, index) => (
              <li
                key={module.id}
                {...moduleDrag.getItemProps(module.id)}
                className={cn(
                  'rounded-lg',
                  moduleDrag.draggingId === module.id && 'opacity-40',
                  moduleDrag.overId === module.id &&
                    moduleDrag.draggingId !== module.id &&
                    'ring-2 ring-brand-500',
                )}
              >
                <div className="group flex items-center gap-1 rounded-lg px-2 py-2 hover:bg-slate-800">
                  <GripVertical
                    size={14}
                    className="shrink-0 cursor-grab text-slate-600 active:cursor-grabbing"
                  />
                  <button
                    type="button"
                    onClick={() => toggleCollapse(module.id)}
                    aria-expanded={!collapsed.has(module.id)}
                    aria-label={collapsed.has(module.id) ? 'Expandir modulo' : 'Recolher modulo'}
                    className="shrink-0 text-slate-500"
                  >
                    <ChevronDown
                      size={15}
                      className={cn('transition-transform', collapsed.has(module.id) && '-rotate-90')}
                    />
                  </button>

                  {editing?.kind === 'module' && editing.id === module.id ? (
                    <InlineRename
                      value={editing.value}
                      onChange={(value) => setEditing({ ...editing, value })}
                      onSave={() => renameModule({ id: module.id, title: editing.value })}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">
                        {index + 1}. {module.title}
                      </span>
                      <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <IconButton
                          icon={Pencil}
                          label="Renomear modulo"
                          onClick={() =>
                            setEditing({ kind: 'module', id: module.id, value: module.title })
                          }
                        />
                        <IconButton
                          icon={Plus}
                          label="Adicionar licao"
                          onClick={() => addLesson(module.id)}
                        />
                        <IconButton
                          icon={Trash2}
                          label="Excluir modulo"
                          danger
                          onClick={() => setConfirm({ kind: 'module', item: module })}
                        />
                      </span>
                    </>
                  )}
                </div>

                {!collapsed.has(module.id) && (
                  <LessonList
                    module={module}
                    activeLessonId={activeLessonId}
                    onSelectLesson={onSelectLesson}
                    editing={editing}
                    setEditing={setEditing}
                    onRename={renameLesson}
                    onDelete={(lesson) => setConfirm({ kind: 'lesson', item: lesson })}
                    onAddLesson={() => addLesson(module.id)}
                    onReorder={refresh}
                    onError={onError}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={confirm?.kind === 'module'}
        onClose={() => setConfirm(null)}
        onConfirm={() => removeModule(confirm.item.id)}
        title="Excluir modulo"
        message="Todas as licoes e blocos deste modulo serao excluidos. Esta acao nao pode ser desfeita."
        confirmLabel="Excluir modulo"
      />
      <ConfirmModal
        open={confirm?.kind === 'lesson'}
        onClose={() => setConfirm(null)}
        onConfirm={() => removeLesson(confirm.item.id)}
        title="Excluir licao"
        message="Os blocos desta licao serao excluidos. Esta acao nao pode ser desfeita."
        confirmLabel="Excluir licao"
      />
    </div>
  )
}

function LessonList({
  module,
  activeLessonId,
  onSelectLesson,
  editing,
  setEditing,
  onRename,
  onDelete,
  onAddLesson,
  onReorder,
  onError,
}) {
  const toast = useToast()

  const { mutate: moveLessons } = useMutation({
    mutationFn: (ids) => reorderLessons(module.id, ids),
    onSuccess: onReorder,
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel reordenar as licoes.')),
  })

  const drag = useDragReorder(module.lessons, moveLessons)

  return (
    <ul className="ml-6 space-y-0.5 border-l border-slate-700 pl-2">
      {module.lessons.length === 0 && (
        <li className="px-2 py-1 text-xs text-slate-600">Sem licoes.</li>
      )}
      {module.lessons.map((lesson) => {
        const active = lesson.id === activeLessonId
        const isEditing = editing?.kind === 'lesson' && editing.id === lesson.id

        return (
          <li
            key={lesson.id}
            {...drag.getItemProps(lesson.id)}
            className={cn(
              'rounded-lg',
              drag.draggingId === lesson.id && 'opacity-40',
              drag.overId === lesson.id && drag.draggingId !== lesson.id && 'ring-2 ring-brand-500',
            )}
          >
            <div
              className={cn(
                'group flex items-center gap-1 rounded-lg px-2 py-1.5',
                active ? 'bg-brand-500/10' : 'hover:bg-slate-800',
              )}
            >
              <GripVertical
                size={13}
                className="shrink-0 cursor-grab text-slate-600 active:cursor-grabbing"
              />

              {isEditing ? (
                <InlineRename
                  value={editing.value}
                  onChange={(value) => setEditing({ ...editing, value })}
                  onSave={() => onRename({ id: lesson.id, title: editing.value })}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectLesson(lesson.id)}
                    className={cn(
                      'min-w-0 flex-1 truncate text-left text-sm',
                      active ? 'font-medium text-brand-300' : 'text-slate-400 hover:text-slate-200',
                    )}
                  >
                    {lesson.title}
                  </button>
                  <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <IconButton
                      icon={Pencil}
                      label="Renomear licao"
                      onClick={() => setEditing({ kind: 'lesson', id: lesson.id, value: lesson.title })}
                    />
                    <IconButton
                      icon={Trash2}
                      label="Excluir licao"
                      danger
                      onClick={() => onDelete(lesson)}
                    />
                  </span>
                </>
              )}
            </div>
          </li>
        )
      })}
      <li>
        <button
          type="button"
          onClick={onAddLesson}
          className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-300"
        >
          <Plus size={13} className="shrink-0" /> Nova licao
        </button>
      </li>
    </ul>
  )
}

function InlineRename({ value, onChange, onSave, onCancel }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSave()
          if (event.key === 'Escape') onCancel()
        }}
        className="min-w-0 flex-1 rounded border border-brand-500 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:outline-none"
        aria-label="Novo titulo"
      />
      <IconButton icon={Check} label="Salvar" onClick={onSave} disabled={!value.trim()} />
      <IconButton icon={X} label="Cancelar" onClick={onCancel} />
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
        'rounded p-1 text-slate-500 transition-colors disabled:opacity-40',
        danger ? 'hover:bg-slate-700 hover:text-red-400' : 'hover:bg-slate-700 hover:text-slate-200',
      )}
    >
      <Icon size={13} />
    </button>
  )
}
