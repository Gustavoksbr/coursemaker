import { useEffect, useState } from 'react'
import { Eye, GripVertical, Pencil as PencilIcon, Trash2 } from 'lucide-react'
import { AddBlockBar, BLOCK_META, BlockEditor } from './BlockEditor'
import { BlockRenderer } from './BlockRenderer'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { useDragReorder } from '@/hooks/useDragReorder'
import { BLOCK_TYPE } from '@/lib/constants'
import { cn } from '@/lib/cn'

const DEFAULT_CONTENT = {
  [BLOCK_TYPE.TEXT]: '<p></p>',
  [BLOCK_TYPE.CODE]: '',
  [BLOCK_TYPE.IMAGE]: '',
  [BLOCK_TYPE.VIDEO]: '',
}

/**
 * The content area of the editor: an ordered list of blocks with inline editing, drag-and-drop
 * reordering, and an Editar/Visualizar toggle.
 *
 * Every block is always editable - there is no per-block save step, `draft` (from
 * `useCurriculumDraft`/`useBlocksDraft`) holds every edit live and only reaches the server when the
 * page's own "Salvar alteracoes" flushes it. Visualizar therefore always shows exactly what is
 * currently in the edit fields.
 */
export function BlockListEditor({ parentId, draft, emptyMessage }) {
  const [mode, setMode] = useState('edit')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [isPending, setIsPending] = useState(Boolean(parentId))

  // Seeding is a one-shot fetch-into-the-local-draft; it deliberately does NOT go through
  // react-query. A react-query cache entry would outlive this component's draft state (which gets
  // torn down and recreated empty on every remount, e.g. leaving the editor via "Cancelar" and
  // coming back), so a cached-but-now-stale query would report success without ever re-seeding the
  // fresh draft - blocks would silently show empty forever. `draft.seed()` is itself idempotent per
  // parent, so calling it again here on remount is always safe and cheap.
  useEffect(() => {
    if (!parentId) {
      setIsPending(false)
      return undefined
    }
    let cancelled = false
    setIsPending(true)
    Promise.resolve(draft.seed()).finally(() => {
      if (!cancelled) setIsPending(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId])

  const blocks = draft.blocks

  const { getItemProps, draggingId, overId } = useDragReorder(blocks ?? [], draft.reorderBlocks)

  useEffect(() => {
    if (confirmDelete && !blocks.some((block) => block.id === confirmDelete.id)) {
      setConfirmDelete(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  if (isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  const addBlock = (type) => {
    draft.addBlock({
      type,
      content: DEFAULT_CONTENT[type],
      language: type === BLOCK_TYPE.CODE ? 'javascript' : undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-slate-700 p-0.5">
        <ModeButton active={mode === 'edit'} onClick={() => setMode('edit')} icon={PencilIcon} label="Editar" />
        <ModeButton active={mode === 'preview'} onClick={() => setMode('preview')} icon={Eye} label="Visualizar" />
      </div>

      {blocks.length === 0 ? (
        <EmptyState
          icon={PencilIcon}
          title="Nenhum bloco ainda"
          message={emptyMessage ?? 'Adicione texto, codigo, imagens ou videos abaixo.'}
        />
      ) : mode === 'preview' ? (
        <div className="space-y-6 rounded-lg border border-slate-700 bg-slate-800/40 p-5">
          {blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {blocks.map((block) => {
            const meta = BLOCK_META[block.type] ?? {}
            const Icon = meta.icon

            return (
              <li
                key={block.id}
                {...getItemProps(block.id)}
                className={cn(
                  'rounded-lg transition-opacity',
                  draggingId === block.id && 'opacity-40',
                  overId === block.id && draggingId !== block.id && 'ring-2 ring-brand-500',
                )}
              >
                <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
                  <GripVertical size={14} className="cursor-grab active:cursor-grabbing" />
                  {Icon && <Icon size={13} />}
                  <span className="uppercase tracking-wide">{meta.label ?? block.type}</span>
                  {block.type === BLOCK_TYPE.CODE && block.language && (
                    <span className="font-mono">({block.language})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(block)}
                    className="ml-auto rounded p-1 hover:bg-slate-700 hover:text-red-400"
                    aria-label="Excluir bloco"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <BlockEditor block={block} onChange={(fields) => draft.updateBlock(block.id, fields)} />
              </li>
            )
          })}
        </ul>
      )}

      {mode === 'edit' && <AddBlockBar onAdd={addBlock} />}

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          draft.removeBlock(confirmDelete.id)
          setConfirmDelete(null)
        }}
        title="Excluir bloco"
        message="O conteudo deste bloco sera perdido quando as alteracoes forem salvas. Esta acao nao pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}

function ModeButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200',
      )}
    >
      <Icon size={14} /> {label}
    </button>
  )
}
