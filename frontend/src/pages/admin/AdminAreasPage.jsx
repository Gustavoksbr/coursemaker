import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState, PageLoader } from '@/components/ui/Feedback'
import { useToast } from '@/context/ToastContext'
import { areaKeys, createArea, deleteArea, listAreas, updateArea } from '@/api/areas'
import { errorMessage } from '@/lib/api'
import { LIMITS } from '@/lib/constants'

/**
 * Admin-only: the fixed, curated list of areas (Programação, Xadrez, ...) that every
 * course/post/trilha owner picks from. Admins only manage the list here — they never assign
 * content to an area themselves, that stays entirely with each content's own owner.
 */
export default function AdminAreasPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data: areas, isPending } = useQuery({ queryKey: areaKeys.list(), queryFn: listAreas })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: areaKeys.all })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () => createArea({ name: newName.trim() }),
    onSuccess: () => {
      setNewName('')
      invalidate()
      toast.success('Area criada.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel criar a area.')),
  })

  const { mutate: rename, isPending: renaming } = useMutation({
    mutationFn: () => updateArea(editingId, { name: editingName.trim() }),
    onSuccess: () => {
      setEditingId(null)
      invalidate()
      toast.success('Area renomeada.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel renomear a area.')),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => deleteArea(confirmDelete.id),
    onSuccess: () => {
      setConfirmDelete(null)
      invalidate()
      toast.success('Area excluida.')
    },
    onError: (error) => {
      setConfirmDelete(null)
      toast.error(errorMessage(error, 'Nao foi possivel excluir a area.'))
    },
  })

  const startEditing = (area) => {
    setEditingId(area.id)
    setEditingName(area.name)
  }

  if (isPending) return <PageLoader label="Carregando areas..." />

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Gerenciar areas</h1>
        <p className="mt-1 text-sm text-slate-400">
          Cursos, posts e trilhas escolhem uma dessas areas ao serem criados.
        </p>
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (newName.trim()) create()
        }}
      >
        <Field label="Nova area" htmlFor="new-area-name" className="flex-1">
          <Input
            id="new-area-name"
            maxLength={LIMITS.NAME}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Ex.: Xadrez"
          />
        </Field>
        <Button type="submit" loading={creating} disabled={!newName.trim()}>
          <Plus size={16} /> Criar
        </Button>
      </form>

      {areas.length === 0 ? (
        <EmptyState title="Nenhuma area ainda" message="Crie a primeira area acima." />
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700">
          {areas.map((area) => (
            <li key={area.id} className="flex items-center gap-2 px-4 py-3">
              {editingId === area.id ? (
                <>
                  <Input
                    autoFocus
                    maxLength={LIMITS.NAME}
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => editingName.trim() && rename()}
                    disabled={renaming || !editingName.trim()}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-green-400 disabled:opacity-50"
                    aria-label="Salvar"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    aria-label="Cancelar"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-200">{area.name}</span>
                  <button
                    type="button"
                    onClick={() => startEditing(area)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    aria-label="Renomear"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(area)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                    aria-label="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove()}
        loading={deleting}
        title="Excluir area"
        message={`Excluir "${confirmDelete?.name}"? So funciona se nenhum curso, post ou trilha estiver usando essa area.`}
        confirmLabel="Excluir"
      />
    </div>
  )
}
