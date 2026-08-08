import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, GripVertical, Pencil, Pencil as PencilIcon, Trash2 } from 'lucide-react'
import { AddBlockBar, BLOCK_META, BlockEditor } from './BlockEditor'
import { BlockRenderer } from './BlockRenderer'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { useDragReorder } from '@/hooks/useDragReorder'
import { useToast } from '@/context/ToastContext'
import { errorMessage } from '@/lib/api'
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
 * In preview mode the block being edited renders from its unsaved draft, so the toggle shows the
 * changes before they are persisted — which is the point of having a preview at all.
 */
export function BlockListEditor({ parentId, api, queryKey, emptyMessage }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [mode, setMode] = useState('edit')
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data: blocks, isPending } = useQuery({
    queryKey,
    queryFn: () => api.list(parentId),
    enabled: Boolean(parentId),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey })

  const { mutate: addBlock, isPending: adding } = useMutation({
    mutationFn: (type) =>
      api.create(parentId, {
        type,
        content: DEFAULT_CONTENT[type],
        language: type === BLOCK_TYPE.CODE ? 'javascript' : undefined,
      }),
    onSuccess: (created) => {
      refresh()
      // Drop straight into editing the new block: it is empty, so there is nothing else to do.
      setEditingId(created.id)
      setDraft(null)
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel adicionar o bloco.')),
  })

  const { mutate: saveBlock, isPending: saving } = useMutation({
    mutationFn: ({ id, values }) => api.update(id, values),
    onSuccess: () => {
      setEditingId(null)
      setDraft(null)
      refresh()
      toast.success('Bloco salvo.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel salvar o bloco.')),
  })

  const { mutate: removeBlock } = useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => {
      setConfirmDelete(null)
      if (editingId === confirmDelete?.id) setEditingId(null)
      refresh()
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel excluir o bloco.')),
  })

  const { mutate: reorder } = useMutation({
    mutationFn: (ids) => api.reorder(parentId, ids),
    onMutate: async (ids) => {
      // Reordering is instant to the eye; roll back if the server disagrees.
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (current) =>
        ids.map((id) => current.find((block) => block.id === id)).filter(Boolean),
      )
      return { previous }
    },
    onError: (error, _ids, context) => {
      queryClient.setQueryData(queryKey, context.previous)
      toast.error(errorMessage(error, 'Nao foi possivel reordenar os blocos.'))
    },
    onSettled: refresh,
  })

  const { getItemProps, draggingId, overId } = useDragReorder(blocks ?? [], reorder)

  if (isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  /** In preview, the block under edit renders from the draft rather than from the saved copy. */
  const previewBlock = (block) => (block.id === editingId && draft ? { ...block, ...draft } : block)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-700 p-0.5">
          <ModeButton
            active={mode === 'edit'}
            onClick={() => setMode('edit')}
            icon={PencilIcon}
            label="Editar"
          />
          <ModeButton
            active={mode === 'preview'}
            onClick={() => setMode('preview')}
            icon={Eye}
            label="Visualizar"
          />
        </div>
        {mode === 'preview' && editingId && draft && (
          <p className="text-xs text-amber-400">Mostrando alteracoes ainda nao salvas.</p>
        )}
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
            <BlockRenderer key={block.id} block={previewBlock(block)} />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {blocks.map((block) => {
            const meta = BLOCK_META[block.type] ?? {}
            const Icon = meta.icon
            const isEditing = block.id === editingId

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
                  <span className="ml-auto flex items-center gap-1">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(block.id)
                          setDraft(null)
                        }}
                        className="rounded p-1 hover:bg-slate-700 hover:text-slate-200"
                        aria-label="Editar bloco"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(block)}
                      className="rounded p-1 hover:bg-slate-700 hover:text-red-400"
                      aria-label="Excluir bloco"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>

                {isEditing ? (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    saving={saving}
                    onDraftChange={setDraft}
                    onCancel={() => {
                      setEditingId(null)
                      setDraft(null)
                    }}
                    onSave={(values) => saveBlock({ id: block.id, values })}
                  />
                ) : (
                  <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                    <BlockRenderer block={block} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {mode === 'edit' && <AddBlockBar onAdd={addBlock} disabled={adding} />}

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => removeBlock(confirmDelete.id)}
        title="Excluir bloco"
        message="O conteudo deste bloco sera perdido. Esta acao nao pode ser desfeita."
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
