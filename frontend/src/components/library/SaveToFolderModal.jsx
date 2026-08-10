import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FolderOpen, Heart, Loader2, Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Feedback'
import { useToast } from '@/context/ToastContext'
import {
  createFolder,
  getCourseStatus,
  getPostStatus,
  getTrilhaStatus,
  libraryKeys,
  listFolders,
  moveCourseToFolder,
  movePostToFolder,
  moveTrilhaToFolder,
  unsaveCourse,
  unsavePost,
  unsaveTrilha,
} from '@/api/library'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

const STATUS_FETCHERS = { course: getCourseStatus, post: getPostStatus, trilha: getTrilhaStatus }
const MOVERS = { course: moveCourseToFolder, post: movePostToFolder, trilha: moveTrilhaToFolder }
const UNSAVERS = { course: unsaveCourse, post: unsavePost, trilha: unsaveTrilha }

/**
 * Where the bookmark button on a course/post/trilha always lands: pick a folder to save it into.
 * There is no favoriting action -- "Favoritos" is simply the default folder the backend always
 * returns first in the list, alongside whatever folders the user made themselves.
 */
export function SaveToFolderModal({ open, onClose, kind, contentId, onChange }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const statusKey = libraryKeys.status(kind, contentId)
  const statusQuery = useQuery({
    queryKey: statusKey,
    queryFn: () => STATUS_FETCHERS[kind](contentId),
    enabled: open,
  })
  const foldersQuery = useQuery({ queryKey: libraryKeys.folders, queryFn: listFolders, enabled: open })

  useEffect(() => {
    if (!open) {
      setCreating(false)
      setNewFolderName('')
    }
  }, [open])

  const settle = (status) => {
    // A save/move/remove can affect the status badge, both folders' item counts, and whichever
    // folder listings the item entered or left -- invalidating the whole
    // "library" prefix is simpler and safer than trying to enumerate every affected key (the
    // global 30s staleTime means anything missed here would otherwise show stale data on the
    // very next navigation, not just eventually).
    queryClient.invalidateQueries({ queryKey: ['library'] })
    onChange?.(status)
    onClose()
  }

  const { mutate: selectFolder, isPending: moving } = useMutation({
    mutationFn: (folderId) => MOVERS[kind](contentId, folderId),
    onSuccess: settle,
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel salvar.')),
  })

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: () => UNSAVERS[kind](contentId),
    onSuccess: settle,
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel remover.')),
  })

  const { mutate: createAndSelect, isPending: savingNewFolder } = useMutation({
    mutationFn: async () => {
      const folder = await createFolder(newFolderName.trim())
      return MOVERS[kind](contentId, folder.id)
    },
    onSuccess: settle,
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel criar a pasta.')),
  })

  const loading = statusQuery.isPending || foldersQuery.isPending
  const busy = moving || removing || savingNewFolder
  // null when the content is not saved anywhere; otherwise the folder it currently sits in.
  const currentFolderId = statusQuery.data?.saved ? statusQuery.data.folderId : null

  return (
    <Modal open={open} onClose={onClose} title="Salvar na biblioteca" size="sm">
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-1">
          {foldersQuery.data.map((folder) => (
            <OptionRow
              key={folder.id}
              icon={folder.isDefault ? Heart : FolderOpen}
              label={folder.name}
              selected={currentFolderId === folder.id}
              disabled={busy}
              onClick={() => selectFolder(folder.id)}
            />
          ))}

          {creating ? (
            <div className="flex items-center gap-1.5 px-1 py-1.5">
              <input
                autoFocus
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && newFolderName.trim()) createAndSelect()
                }}
                placeholder="Nome da pasta"
                maxLength={100}
                className="input flex-1 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => createAndSelect()}
                disabled={!newFolderName.trim() || busy}
                className="btn-primary px-2.5 py-1.5 text-xs"
              >
                {savingNewFolder ? <Loader2 size={14} className="animate-spin" /> : 'Criar'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              disabled={busy}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-brand-400 hover:bg-slate-700"
            >
              <Plus size={16} /> Nova pasta
            </button>
          )}

          {currentFolderId !== null && (
            <button
              type="button"
              onClick={() => remove()}
              disabled={busy}
              className="mt-2 flex w-full items-center gap-2.5 border-t border-slate-700 px-3 pb-1 pt-3 text-left text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 size={15} /> Remover dos salvos
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}

function OptionRow({ icon: Icon, label, selected, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-700 disabled:opacity-50',
        selected ? 'text-slate-100' : 'text-slate-300',
      )}
    >
      <Icon size={16} className="shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected && <Check size={15} className="shrink-0 text-brand-400" />}
    </button>
  )
}
