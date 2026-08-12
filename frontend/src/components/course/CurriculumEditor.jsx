import { useState } from 'react'
import { Check, ChevronDown, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { useDragReorder } from '@/hooks/useDragReorder'
import { cn } from '@/lib/cn'

/**
 * The middle column of the course editor: modules and lessons, with inline renaming, drag-and-drop
 * reordering (lessons reorder within their own module) and lesson selection.
 *
 * Every add/rename/delete/reorder writes to `draft` (a `useCurriculumDraft`) only - nothing hits
 * the network here. The page's own "Salvar" button flushes it.
 */
export function CurriculumEditor({ draft, activeLessonId, onSelectLesson }) {
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const addModule = () => {
    const id = draft.addModule()
    setEditing({ kind: 'module', id, value: 'Novo modulo' })
  }

  const addLesson = (moduleId) => {
    const id = draft.addLesson(moduleId)
    onSelectLesson(id)
    setEditing({ kind: 'lesson', id, value: 'Nova licao' })
  }

  const removeModule = (module) => {
    draft.deleteModule(module.id)
    setConfirm(null)
  }

  const removeLesson = (moduleId, lesson) => {
    draft.deleteLesson(moduleId, lesson.id)
    if (lesson.id === activeLessonId) onSelectLesson(null)
    setConfirm(null)
  }

  const moduleDrag = useDragReorder(draft.modules, draft.reorderModules)

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
          onClick={addModule}
          disabled={draft.isFlushing}
          className="btn-ghost px-2 py-1 text-xs"
        >
          <Plus size={14} /> Modulo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {draft.modules.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-slate-500">
            Comece adicionando um modulo.
          </p>
        ) : (
          <ul className="space-y-1">
            {draft.modules.map((module, index) => (
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
                      onSave={() => {
                        draft.renameModule(module.id, editing.value)
                        setEditing(null)
                      }}
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
                    draft={draft}
                    onDelete={(lesson) => setConfirm({ kind: 'lesson', moduleId: module.id, item: lesson })}
                    onAddLesson={() => addLesson(module.id)}
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
        onConfirm={() => removeModule(confirm.item)}
        title="Excluir modulo"
        message="Todas as licoes e blocos deste modulo serao excluidos. Esta acao nao pode ser desfeita."
        confirmLabel="Excluir modulo"
      />
      <ConfirmModal
        open={confirm?.kind === 'lesson'}
        onClose={() => setConfirm(null)}
        onConfirm={() => removeLesson(confirm.moduleId, confirm.item)}
        title="Excluir licao"
        message="Os blocos desta licao serao excluidos. Esta acao nao pode ser desfeita."
        confirmLabel="Excluir licao"
      />
    </div>
  )
}

function LessonList({ module, activeLessonId, onSelectLesson, editing, setEditing, draft, onDelete, onAddLesson }) {
  const drag = useDragReorder(module.lessons, (ids) => draft.reorderLessons(module.id, ids))

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
                  onSave={() => {
                    draft.renameLesson(module.id, lesson.id, editing.value)
                    setEditing(null)
                  }}
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
